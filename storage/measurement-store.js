import { MAX_HISTORY_AGE_MS, MAX_HISTORY_ENTRIES, STORAGE_KEYS } from "../shared/constants.js";
import { calculateDelay, calculateStatus } from "../domain/status-calculator.js";
import { coordinateStorageMutation } from "./storage-mutation-coordinator.js";

function storageOrDefault(storageArea) {
  return storageArea ?? chrome.storage.local;
}

export function loadMeasurements(storageArea, now = new Date(), mutationContext) {
  const storage = storageOrDefault(storageArea);
  return coordinateStorageMutation(mutationContext, async () => {
    const values = await storage.get([
      STORAGE_KEYS.measurements,
      STORAGE_KEYS.lastMeasurement,
    ]);
    const storedMeasurements = Array.isArray(values.measurements) ? values.measurements : [];
    const cutoff = now.getTime() - MAX_HISTORY_AGE_MS;
    const measurements = storedMeasurements
      .filter((item) => Date.parse(item.observedAt) >= cutoff)
      .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt))
      .slice(-MAX_HISTORY_ENTRIES);
    if (JSON.stringify(measurements) !== JSON.stringify(storedMeasurements)) {
      await storage.set({ [STORAGE_KEYS.measurements]: measurements });
    }
    return {
      measurements,
      lastMeasurement: values.lastMeasurement ?? null,
    };
  });
}

export function appendMeasurement(measurement, storageArea, now = new Date(), mutationContext) {
  const storage = storageOrDefault(storageArea);
  return coordinateStorageMutation(mutationContext, async (activeContext) => {
    const current = await loadMeasurements(storage, now, activeContext);
    const cutoff = now.getTime() - MAX_HISTORY_AGE_MS;
    const measurements = [...current.measurements, measurement]
      .filter((item) => Date.parse(item.observedAt) >= cutoff)
      .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt))
      .slice(-MAX_HISTORY_ENTRIES);
    await storage.set({
      [STORAGE_KEYS.measurements]: measurements,
      [STORAGE_KEYS.lastMeasurement]: measurement,
    });
    return measurements;
  });
}

export function reclassifyMeasurements(thresholds, storageArea, mutationContext) {
  const storage = storageOrDefault(storageArea);
  return coordinateStorageMutation(mutationContext, async (activeContext) => {
    const current = await loadMeasurements(storage, new Date(), activeContext);
    const reclassify = (measurement) => {
      const { delaySeconds, delayPercent } = calculateDelay(
        measurement.durationSeconds,
        measurement.baselineSeconds,
      );
      return {
        ...measurement,
        delaySeconds,
        status: calculateStatus({ delaySeconds, delayPercent }, thresholds),
      };
    };
    const measurements = current.measurements.map(reclassify);
    const lastMeasurement = current.lastMeasurement ? reclassify(current.lastMeasurement) : null;
    await storage.set({
      [STORAGE_KEYS.measurements]: measurements,
      [STORAGE_KEYS.lastMeasurement]: lastMeasurement,
    });
    return { measurements, lastMeasurement };
  });
}
