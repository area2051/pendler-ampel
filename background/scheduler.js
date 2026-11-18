import { ALARM_NAMES, STALE_AFTER_MS } from "../shared/constants.js";
import { isWithinSchedule } from "../domain/schedule-calculator.js";
import { isMeasurementStale } from "./badge-service.js";

export function shouldAutomaticallyRefresh(state, now = new Date()) {
  return Boolean(
    state.complete
    && state.verified
    && state.configuration.autoRefreshEnabled
    && isWithinSchedule(state.configuration, now),
  );
}

export function shouldRefreshOnStartup(state, now = new Date()) {
  return shouldAutomaticallyRefresh(state, now)
    && isMeasurementStale(state.lastMeasurement, now);
}

export async function synchronizeAlarms(state, alarmsApi = chrome.alarms, now = new Date()) {
  const [refreshAlarm, staleAlarm] = await Promise.all([
    alarmsApi.get(ALARM_NAMES.refresh),
    alarmsApi.get(ALARM_NAMES.stale),
  ]);
  const refreshEnabled = state.complete && state.verified && state.configuration.autoRefreshEnabled;
  const intervalMinutes = state.configuration.intervalMinutes;
  if (!refreshEnabled && refreshAlarm) {
    await alarmsApi.clear(ALARM_NAMES.refresh);
  } else if (refreshEnabled && refreshAlarm?.periodInMinutes !== intervalMinutes) {
    if (refreshAlarm) await alarmsApi.clear(ALARM_NAMES.refresh);
    await alarmsApi.create(ALARM_NAMES.refresh, { periodInMinutes: intervalMinutes });
  }

  let staleAt = null;
  if (state.lastMeasurement) {
    const candidate = Date.parse(state.lastMeasurement.observedAt) + STALE_AFTER_MS + 1_000;
    if (candidate > now.getTime()) staleAt = candidate;
  }
  const matchingStaleAlarm = staleAt !== null
    && staleAlarm
    && Math.abs(staleAlarm.scheduledTime - staleAt) <= 1_000;
  if (staleAlarm && !matchingStaleAlarm) await alarmsApi.clear(ALARM_NAMES.stale);
  if (staleAt !== null && !matchingStaleAlarm) {
    await alarmsApi.create(ALARM_NAMES.stale, { when: staleAt });
  }
}
