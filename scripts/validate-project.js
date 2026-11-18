import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SourceTextModule } from "node:vm";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const required = [
  "manifest.json", "background/service-worker.js", "options/options.html",
  "popup/popup.html", "sidepanel/sidepanel.html", "docs/privacy.md", "README.md",
];
const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  if (entry.name === "node_modules") return [];
  return entry.isDirectory() ? walk(path) : [path];
});

for (const path of required) readFileSync(join(root, path));
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const packageManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (manifest.version !== packageManifest.version) throw new Error("Manifest- und Paketversion müssen übereinstimmen.");
const expectedPermissions = ["alarms", "notifications", "sidePanel", "storage"];
if (JSON.stringify([...manifest.permissions].sort()) !== JSON.stringify(expectedPermissions)) throw new Error("Manifest enthält unerwartete Berechtigungen.");
if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(["https://routes.googleapis.com/*"])) throw new Error("Host-Berechtigungen sind nicht minimal.");
if (manifest.minimum_chrome_version !== "116") throw new Error("Chrome 116 muss als Mindestversion gesetzt sein.");
if (manifest.content_security_policy?.extension_pages !== "script-src 'self'; object-src 'self'") throw new Error("Extension-CSP fehlt oder ist unerwartet.");

const files = walk(root);
for (const file of files.filter((path) => extname(path) === ".js")) {
  const source = readFileSync(file, "utf8");
  new SourceTextModule(source, { identifier: file });
  if (/\beval\s*\(/.test(source)) throw new Error(`eval ist verboten: ${relative(root, file)}`);
  if (/chrome\.storage\.sync/.test(source)) throw new Error(`storage.sync ist verboten: ${relative(root, file)}`);
  if (/AIza[0-9A-Za-z_-]{20,}/.test(source)) throw new Error(`Möglicher API-Key gefunden: ${relative(root, file)}`);
}
for (const file of files.filter((path) => extname(path) === ".html")) {
  const source = readFileSync(file, "utf8");
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(source)) throw new Error(`Inline-Skript gefunden: ${relative(root, file)}`);
  if (/\bon[a-z]+\s*=/i.test(source)) throw new Error(`Inline-Eventhandler gefunden: ${relative(root, file)}`);
  if (/(?:src|href)=["']https?:/i.test(source)) throw new Error(`Remote-Ressource gefunden: ${relative(root, file)}`);
}
for (const size of [16, 32, 48, 128]) {
  const png = readFileSync(join(root, `assets/icon-${size}.png`));
  if (png.readUInt32BE(16) !== size || png.readUInt32BE(20) !== size) throw new Error(`Icon ${size} hat falsche Abmessungen.`);
}
console.log(`Projektprüfung erfolgreich: ${files.length} Dateien geprüft.`);
