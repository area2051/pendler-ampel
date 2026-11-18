import { formatClock, formatSigned } from "../shared/formatting.js";
import { MESSAGE_TYPES } from "../shared/messages.js";
import { runButtonAction, startPeriodicReload } from "../shared/page-lifecycle.js";

const statusNames = { green: "Normal", orange: "Erhöht", red: "Stark", gray: "Veraltet" };
const trendNames = { increasing: "↗ Verkehr nimmt zu", stable: "→ Verkehr stabil", decreasing: "↘ Verkehr nimmt ab", unknown: "– Trend noch nicht verfügbar" };
let currentState = null;

async function send(type) {
  const response = await chrome.runtime.sendMessage({ type });
  if (!response?.ok) throw new Error(response?.error?.message ?? "Unbekannter Fehler.");
  return response.data;
}

function render(state) {
  currentState = state;
  document.querySelector("#setup").hidden = state.complete && state.verified;
  document.querySelector("#dashboard").hidden = !state.complete || !state.verified;
  document.querySelector("#load-error").hidden = true;
  if (!state.complete || !state.verified) return;

  document.querySelector("#route-label").textContent = state.routeLabel;
  document.querySelector("#status-label").className = `status status--${state.effectiveStatus}`;
  document.querySelector("#status-text").textContent = statusNames[state.effectiveStatus];
  document.querySelector("#current-time").textContent = state.currentMinutes === null ? "--" : `${state.currentMinutes} Minuten`;
  document.querySelector("#normal-time").textContent = state.normalMinutes === null ? "--" : `${state.normalMinutes} Minuten`;
  document.querySelector("#delay").textContent = state.delayMinutes === null ? "Keine Messung" : `${formatSigned(state.delayMinutes, " Minuten")} · ${formatSigned(state.delayPercent, " %")}`;
  document.querySelector("#trend").textContent = trendNames[state.trend];
  document.querySelector("#updated").textContent = state.measurement ? `Aktualisiert um ${formatClock(state.measurement.observedAt)} Uhr${state.stale ? " · Daten veraltet" : ""}` : "Noch keine erfolgreiche Aktualisierung";
  const errorBox = document.querySelector("#error");
  errorBox.hidden = !state.lastError;
  errorBox.textContent = state.lastError?.message ?? "";
  document.querySelector("#open-route").disabled = !state.routeUrl;
}

async function reload() {
  try { render(await send(MESSAGE_TYPES.getPublicState)); }
  catch (error) {
    document.querySelector("#setup").hidden = true;
    document.querySelector("#dashboard").hidden = true;
    document.querySelector("#load-error").hidden = false;
    document.querySelector("#load-error-message").textContent = error.message;
  }
}

document.querySelectorAll(".open-options").forEach((button) => button.addEventListener("click", () => chrome.runtime.openOptionsPage()));
document.querySelector("#refresh").addEventListener("click", (event) => {
  void runButtonAction(
    event.currentTarget,
    async () => render(await send(MESSAGE_TYPES.refreshNow)),
    (error) => { document.querySelector("#error").textContent = error.message; document.querySelector("#error").hidden = false; },
  );
});
document.querySelector("#open-route").addEventListener("click", () => { if (currentState?.routeUrl) chrome.tabs.create({ url: currentState.routeUrl }); });
document.querySelector("#open-details").addEventListener("click", () => chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT }));
chrome.storage.onChanged.addListener((_changes, area) => { if (area === "local") void reload(); });
startPeriodicReload(reload);
void reload();
