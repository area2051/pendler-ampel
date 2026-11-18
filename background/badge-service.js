import { BADGE_COLORS, STALE_AFTER_MS } from "../shared/constants.js";

export function isMeasurementStale(measurement, now = new Date()) {
  return !measurement || now.getTime() - Date.parse(measurement.observedAt) > STALE_AFTER_MS;
}

export function getBadgePresentation(state, now = new Date()) {
  if (!state.complete || !state.verified) {
    return { text: "--", color: BADGE_COLORS.setup, title: "Pendler-Ampel – Einrichtung erforderlich" };
  }
  const measurement = state.lastMeasurement;
  if (!measurement) {
    return { text: "--", color: BADGE_COLORS.gray, title: "Pendler-Ampel – Keine Verkehrsdaten" };
  }

  const minutes = Math.round(measurement.durationSeconds / 60);
  const stale = isMeasurementStale(measurement, now);
  return {
    text: minutes > 99 ? "99+" : `${minutes}m`,
    color: stale ? BADGE_COLORS.gray : BADGE_COLORS[measurement.status],
    title: stale
      ? "Pendler-Ampel – Daten veraltet"
      : `Pendler-Ampel – ${minutes} Minuten`,
  };
}

export async function updateBadge(state, actionApi = chrome.action, now = new Date()) {
  const presentation = getBadgePresentation(state, now);
  await Promise.all([
    actionApi.setBadgeText({ text: presentation.text }),
    actionApi.setBadgeBackgroundColor({ color: presentation.color }),
    actionApi.setTitle({ title: presentation.title }),
  ]);
}
