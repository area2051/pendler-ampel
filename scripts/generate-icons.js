import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function insideRoundedRect(x, y, left, top, width, height, radius) {
  const closestX = Math.max(left + radius, Math.min(x, left + width - radius));
  const closestY = Math.max(top + radius, Math.min(y, top + height - radius));
  return (x - closestX) ** 2 + (y - closestY) ** 2 <= radius ** 2;
}

function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = size / 128;
  const housing = { x: 34 * scale, y: 8 * scale, width: 60 * scale, height: 112 * scale, radius: 15 * scale };
  const lights = [
    { y: 31, color: [217, 48, 37, 255] },
    { y: 64, color: [227, 116, 0, 255] },
    { y: 97, color: [24, 128, 56, 255] },
  ];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      if (insideRoundedRect(x + 0.5, y + 0.5, housing.x, housing.y, housing.width, housing.height, housing.radius)) {
        pixels.set([40, 44, 52, 255], index);
      }
      for (const light of lights) {
        const dx = x + 0.5 - 64 * scale;
        const dy = y + 0.5 - light.y * scale;
        if (dx * dx + dy * dy <= (12 * scale) ** 2) pixels.set(light.color, index);
      }
    }
  }

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(resolve(root, "assets"), { recursive: true });
for (const size of [16, 32, 48, 128]) writeFileSync(resolve(root, `assets/icon-${size}.png`), createIcon(size));
