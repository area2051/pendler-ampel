import { DEFAULT_CONFIGURATION, DEFAULT_THRESHOLDS } from "./constants.js";

export class ConfigurationValidationError extends Error {
  constructor(errors) {
    super(errors.join(" "));
    this.name = "ConfigurationValidationError";
    this.errors = errors;
  }
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function validTime(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value ?? "");
}

export function normalizeConfiguration(input = {}) {
  const thresholds = input.thresholds ?? {};
  return {
    ...DEFAULT_CONFIGURATION,
    routeLabel: String(input.routeLabel ?? DEFAULT_CONFIGURATION.routeLabel).trim() || DEFAULT_CONFIGURATION.routeLabel,
    origin: String(input.origin ?? "").trim(),
    destination: String(input.destination ?? "").trim(),
    intervalMinutes: finiteNumber(input.intervalMinutes ?? DEFAULT_CONFIGURATION.intervalMinutes),
    activeWeekdays: [...new Set((input.activeWeekdays ?? DEFAULT_CONFIGURATION.activeWeekdays).map(Number))].sort((a, b) => a - b),
    startTime: String(input.startTime ?? DEFAULT_CONFIGURATION.startTime),
    endTime: String(input.endTime ?? DEFAULT_CONFIGURATION.endTime),
    autoRefreshEnabled: Boolean(input.autoRefreshEnabled),
    notificationsEnabled: Boolean(input.notificationsEnabled),
    recoveryNotificationsEnabled: Boolean(input.recoveryNotificationsEnabled),
    avoidTolls: Boolean(input.avoidTolls),
    avoidHighways: Boolean(input.avoidHighways),
    avoidFerries: Boolean(input.avoidFerries),
    thresholds: {
      orangeDelaySeconds: finiteNumber(thresholds.orangeDelaySeconds ?? DEFAULT_THRESHOLDS.orangeDelaySeconds),
      redDelaySeconds: finiteNumber(thresholds.redDelaySeconds ?? DEFAULT_THRESHOLDS.redDelaySeconds),
      orangeDelayPercent: finiteNumber(thresholds.orangeDelayPercent ?? DEFAULT_THRESHOLDS.orangeDelayPercent),
      redDelayPercent: finiteNumber(thresholds.redDelayPercent ?? DEFAULT_THRESHOLDS.redDelayPercent),
      repeatIncreaseSeconds: finiteNumber(thresholds.repeatIncreaseSeconds ?? DEFAULT_THRESHOLDS.repeatIncreaseSeconds),
      cooldownMinutes: finiteNumber(thresholds.cooldownMinutes ?? DEFAULT_THRESHOLDS.cooldownMinutes),
    },
    routeRevision: Number.isInteger(input.routeRevision) ? input.routeRevision : 0,
    routeGeneration: typeof input.routeGeneration === "string" ? input.routeGeneration : "",
  };
}

export function validateConfiguration(configuration, { requireRoute = false } = {}) {
  const errors = [];
  if (requireRoute && !configuration.origin) errors.push("Startadresse fehlt.");
  if (requireRoute && !configuration.destination) errors.push("Zieladresse fehlt.");
  if (!Number.isInteger(configuration.intervalMinutes) || configuration.intervalMinutes < 5 || configuration.intervalMinutes > 15) {
    errors.push("Das Aktualisierungsintervall muss zwischen 5 und 15 Minuten liegen.");
  }
  if (!configuration.activeWeekdays.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)) {
    errors.push("Die aktiven Wochentage sind ungültig.");
  }
  if (configuration.autoRefreshEnabled && configuration.activeWeekdays.length === 0) {
    errors.push("Für automatische Aktualisierungen muss mindestens ein Wochentag aktiv sein.");
  }
  if (!validTime(configuration.startTime) || !validTime(configuration.endTime) || configuration.startTime === configuration.endTime) {
    errors.push("Beginn und Ende müssen gültige, unterschiedliche Uhrzeiten sein.");
  }
  const t = configuration.thresholds;
  if (![t.orangeDelaySeconds, t.redDelaySeconds, t.orangeDelayPercent, t.redDelayPercent].every((value) => value >= 0)) {
    errors.push("Warnschwellen dürfen nicht negativ sein.");
  }
  if (t.redDelaySeconds < t.orangeDelaySeconds || t.redDelayPercent < t.orangeDelayPercent) {
    errors.push("Rote Warnschwellen dürfen nicht unter den orangen Warnschwellen liegen.");
  }
  if (!Number.isFinite(t.repeatIncreaseSeconds) || !Number.isFinite(t.cooldownMinutes)
    || t.repeatIncreaseSeconds <= 0 || t.cooldownMinutes <= 0) {
    errors.push("Wiederholungswarnung und Abklingzeit müssen größer als null sein.");
  }
  return errors;
}
