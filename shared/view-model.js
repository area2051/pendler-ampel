import { calculateTrend } from "../domain/trend-calculator.js";
import { isMeasurementStale } from "../background/badge-service.js";
import { buildGoogleMapsUrl } from "./routes-url.js";

export function buildPublicState(state, now = new Date()) {
  const measurement = state.lastMeasurement ?? null;
  const stale = isMeasurementStale(measurement, now);
  const historyCutoff = now.getTime() - 60 * 60 * 1000;
  const history = (state.measurements ?? []).filter((item) => Date.parse(item.observedAt) >= historyCutoff);
  const base = {
    complete: Boolean(state.complete),
    verified: Boolean(state.verified),
    routeLabel: state.configuration?.routeLabel ?? "Nach Hause",
    routeUrl: state.configuration?.origin && state.configuration?.destination
      ? buildGoogleMapsUrl(state.configuration.origin, state.configuration.destination)
      : null,
    lastError: state.runtimeState?.lastError ?? null,
    lastFetchAttemptAt: state.runtimeState?.lastFetchAttemptAt ?? null,
    measurement,
    history,
    trend: calculateTrend(state.measurements ?? []),
    stale,
    effectiveStatus: stale ? "gray" : measurement?.status ?? "gray",
  };
  if (!measurement) {
    return { ...base, currentMinutes: null, normalMinutes: null, delayMinutes: null, delayPercent: null };
  }
  return {
    ...base,
    currentMinutes: Math.round(measurement.durationSeconds / 60),
    normalMinutes: Math.round(measurement.baselineSeconds / 60),
    delayMinutes: Math.round(measurement.delaySeconds / 60),
    delayPercent: Math.round((measurement.delaySeconds / measurement.baselineSeconds) * 100),
  };
}
