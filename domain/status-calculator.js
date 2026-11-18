export function calculateDelay(durationSeconds, baselineSeconds) {
  if (!Number.isFinite(baselineSeconds) || baselineSeconds <= 0) {
    throw new TypeError("Die statische Fahrzeit muss größer als null sein.");
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new TypeError("Die aktuelle Fahrzeit ist ungültig.");
  }

  const delaySeconds = durationSeconds - baselineSeconds;
  return {
    delaySeconds,
    delayPercent: (delaySeconds / baselineSeconds) * 100,
  };
}

export function calculateStatus({ delaySeconds, delayPercent }, thresholds) {
  if (
    delaySeconds >= thresholds.redDelaySeconds
    || delayPercent >= thresholds.redDelayPercent
  ) {
    return "red";
  }
  if (
    delaySeconds >= thresholds.orangeDelaySeconds
    || delayPercent >= thresholds.orangeDelayPercent
  ) {
    return "orange";
  }
  return "green";
}
