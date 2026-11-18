import { calculateDelay, calculateStatus } from "./status-calculator.js";

export function createMeasurement(route, observedAt, thresholds) {
  const { delaySeconds, delayPercent } = calculateDelay(route.durationSeconds, route.baselineSeconds);
  return {
    observedAt: observedAt.toISOString(),
    durationSeconds: route.durationSeconds,
    baselineSeconds: route.baselineSeconds,
    delaySeconds,
    distanceMeters: route.distanceMeters,
    status: calculateStatus({ delaySeconds, delayPercent }, thresholds),
  };
}
