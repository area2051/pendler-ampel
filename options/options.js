import { MESSAGE_TYPES } from "../shared/messages.js";
import { formatDistance, formatSigned } from "../shared/formatting.js";

const form = document.querySelector("#settings-form");
const statusBox = document.querySelector("#form-status");
const keyInput = document.querySelector("#api-key");
const toggleKeyButton = document.querySelector("#toggle-key");
const apiUsageLog = document.querySelector("#api-usage-log");

const sourceNames = { test: "Verbindungstest", manual: "Manuell", alarm: "Automatisch", startup: "Chrome-Start", unknown: "Unbekannt" };
const outcomeNames = { pending: "Laufend/unterbrochen", success: "Erfolgreich", error: "Fehler" };
const dateTimeFormatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "medium" });

async function send(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response?.ok) throw new Error(response?.error?.message ?? "Unbekannter Fehler.");
  return response.data;
}

function showStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", isError);
  statusBox.hidden = false;
}

function renderApiUsage(apiUsage = { totalCalls: 0, entries: [] }) {
  document.querySelector("#api-total-calls").textContent = String(apiUsage.totalCalls ?? 0);
  apiUsageLog.replaceChildren();
  const entries = [...(apiUsage.entries ?? [])].reverse();
  document.querySelector("#api-usage-empty").hidden = entries.length > 0;
  for (const entry of entries) {
    const row = document.createElement("tr");
    const time = document.createElement("td");
    const source = document.createElement("td");
    const outcome = document.createElement("td");
    const attemptedAt = new Date(entry.attemptedAt);
    time.textContent = Number.isNaN(attemptedAt.getTime()) ? "Unbekannt" : dateTimeFormatter.format(attemptedAt);
    source.textContent = sourceNames[entry.source] ?? sourceNames.unknown;
    outcome.textContent = entry.outcome === "error" && entry.errorCode
      ? `${outcomeNames.error}: ${entry.errorCode}`
      : outcomeNames[entry.outcome] ?? entry.outcome;
    row.append(time, source, outcome);
    apiUsageLog.append(row);
  }
}

function configurationFromForm() {
  return {
    routeLabel: document.querySelector("#route-label").value,
    apiKey: keyInput.value,
    origin: document.querySelector("#origin").value,
    destination: document.querySelector("#destination").value,
    intervalMinutes: Number(document.querySelector("#interval").value),
    activeWeekdays: [...document.querySelectorAll('[name="weekday"]:checked')].map((input) => Number(input.value)),
    startTime: document.querySelector("#start-time").value,
    endTime: document.querySelector("#end-time").value,
    autoRefreshEnabled: document.querySelector("#auto-refresh").checked,
    notificationsEnabled: document.querySelector("#notifications").checked,
    recoveryNotificationsEnabled: document.querySelector("#recovery-notifications").checked,
    avoidTolls: document.querySelector("#avoid-tolls").checked,
    avoidHighways: document.querySelector("#avoid-highways").checked,
    avoidFerries: document.querySelector("#avoid-ferries").checked,
    thresholds: {
      orangeDelaySeconds: Number(document.querySelector("#orange-minutes").value) * 60,
      redDelaySeconds: Number(document.querySelector("#red-minutes").value) * 60,
      orangeDelayPercent: Number(document.querySelector("#orange-percent").value),
      redDelayPercent: Number(document.querySelector("#red-percent").value),
      repeatIncreaseSeconds: Number(document.querySelector("#repeat-minutes").value) * 60,
      cooldownMinutes: Number(document.querySelector("#cooldown-minutes").value),
    },
  };
}

function fillForm(state) {
  document.querySelector("#route-label").value = state.routeLabel;
  keyInput.value = state.apiKey;
  document.querySelector("#origin").value = state.origin;
  document.querySelector("#destination").value = state.destination;
  document.querySelector("#interval").value = String(state.intervalMinutes);
  for (const input of document.querySelectorAll('[name="weekday"]')) input.checked = state.activeWeekdays.includes(Number(input.value));
  document.querySelector("#start-time").value = state.startTime;
  document.querySelector("#end-time").value = state.endTime;
  document.querySelector("#auto-refresh").checked = state.autoRefreshEnabled;
  document.querySelector("#notifications").checked = state.notificationsEnabled;
  document.querySelector("#recovery-notifications").checked = state.recoveryNotificationsEnabled;
  document.querySelector("#avoid-tolls").checked = state.avoidTolls;
  document.querySelector("#avoid-highways").checked = state.avoidHighways;
  document.querySelector("#avoid-ferries").checked = state.avoidFerries;
  document.querySelector("#orange-minutes").value = String(state.thresholds.orangeDelaySeconds / 60);
  document.querySelector("#red-minutes").value = String(state.thresholds.redDelaySeconds / 60);
  document.querySelector("#orange-percent").value = String(state.thresholds.orangeDelayPercent);
  document.querySelector("#red-percent").value = String(state.thresholds.redDelayPercent);
  document.querySelector("#repeat-minutes").value = String(state.thresholds.repeatIncreaseSeconds / 60);
  document.querySelector("#cooldown-minutes").value = String(state.thresholds.cooldownMinutes);
  renderApiUsage(state.apiUsage);
}

async function runBusy(button, operation) {
  button.disabled = true;
  try { await operation(); } catch (error) { showStatus(error.message, true); } finally { button.disabled = false; }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void runBusy(event.submitter, async () => {
    const state = await send(MESSAGE_TYPES.saveConfiguration, { configuration: configurationFromForm() });
    fillForm(state);
    showStatus(state.verified ? "Einstellungen gespeichert. Die Route ist weiterhin verifiziert." : "Einstellungen gespeichert. Bitte teste Verbindung und Route.");
  });
});

document.querySelector("#test-configuration").addEventListener("click", (event) => {
  void runBusy(event.currentTarget, async () => {
    const state = await send(MESSAGE_TYPES.testConfiguration, { configuration: configurationFromForm() });
    showStatus(`Konfiguration erfolgreich. Aktuell ${state.currentMinutes} Minuten, normal ${state.normalMinutes} Minuten, Verzögerung ${formatSigned(state.delayMinutes, " Minuten")} (${formatSigned(state.delayPercent, " %")}), Entfernung ${formatDistance(state.measurement.distanceMeters)}.`);
  });
});

toggleKeyButton.addEventListener("click", () => {
  const visible = keyInput.type === "text";
  keyInput.type = visible ? "password" : "text";
  toggleKeyButton.textContent = visible ? "Anzeigen" : "Verbergen";
  toggleKeyButton.setAttribute("aria-pressed", String(!visible));
});

document.querySelector("#delete-key").addEventListener("click", (event) => {
  if (!confirm("API-Key wirklich löschen? Die übrigen Einstellungen und der Verlauf bleiben erhalten.")) return;
  void runBusy(event.currentTarget, async () => {
    const state = await send(MESSAGE_TYPES.deleteApiKey);
    fillForm(state);
    showStatus("API-Key gelöscht. Automatische Abrufe sind deaktiviert, bis ein neuer Key getestet wurde.");
  });
});

document.querySelector("#clear-data").addEventListener("click", (event) => {
  if (!confirm("Alle lokalen Einstellungen, Adressen, Messungen und den API-Key unwiderruflich löschen?")) return;
  void runBusy(event.currentTarget, async () => {
    const state = await send(MESSAGE_TYPES.clearLocalData);
    fillForm(state);
    showStatus("Alle lokalen Daten wurden gelöscht.");
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.apiUsage) {
    renderApiUsage(changes.apiUsage.newValue);
  }
});

void send(MESSAGE_TYPES.getOptionsState).then(fillForm).catch((error) => showStatus(error.message, true));
