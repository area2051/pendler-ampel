import test from "node:test";
import assert from "node:assert/strict";

import {
  appendMeasurement,
  loadMeasurements,
  reclassifyMeasurements,
} from "../storage/measurement-store.js";
import { MemoryStorage } from "./test-helpers.js";

const at = (hoursAgo, index = 0) => ({
  observedAt: new Date(Date.parse("2026-11-17T18:00:00.000Z") - hoursAgo * 3_600_000 + index).toISOString(),
  durationSeconds: 1_800,
  baselineSeconds: 1_500,
  delaySeconds: 300,
  distanceMeters: 27_400,
  status: "orange",
});

test("appendMeasurement removes values older than 24 hours", async () => {
  const storage = new MemoryStorage({ measurements: [at(25), at(23)] });
  await appendMeasurement(at(0), storage, new Date("2026-11-17T18:00:00.000Z"));

  assert.deepEqual(storage.data.measurements.map((item) => item.observedAt), [at(23).observedAt, at(0).observedAt]);
});

test("loadMeasurements persistently prunes history older than 24 hours", async () => {
  const storage = new MemoryStorage({ measurements: [at(25), at(23)], lastMeasurement: at(23) });

  const result = await loadMeasurements(storage, new Date("2026-11-17T18:00:00.000Z"));

  assert.deepEqual(result.measurements.map((item) => item.observedAt), [at(23).observedAt]);
  assert.deepEqual(storage.data.measurements.map((item) => item.observedAt), [at(23).observedAt]);
  assert.equal(result.lastMeasurement.observedAt, at(23).observedAt);
});

test("loadMeasurements persistently keeps only the newest 300 fresh values", async () => {
  const measurements = Array.from({ length: 301 }, (_, index) => at(1, index));
  const storage = new MemoryStorage({ measurements });

  const result = await loadMeasurements(storage, new Date("2026-11-17T18:00:00.000Z"));

  assert.equal(result.measurements.length, 300);
  assert.equal(storage.data.measurements.length, 300);
  assert.equal(result.measurements[0].observedAt, at(1, 1).observedAt);
});

test("appendMeasurement keeps at most the newest 300 measurements", async () => {
  const existing = Array.from({ length: 300 }, (_, index) => at(1, index));
  const storage = new MemoryStorage({ measurements: existing });
  await appendMeasurement(at(0), storage, new Date("2026-11-17T18:00:00.000Z"));

  assert.equal(storage.data.measurements.length, 300);
  assert.equal(storage.data.measurements.at(-1).observedAt, at(0).observedAt);
  assert.equal(storage.data.lastMeasurement.observedAt, at(0).observedAt);
});

test("reclassifyMeasurements applies changed thresholds without changing traffic values", async () => {
  const measurement = at(0);
  const storage = new MemoryStorage({ measurements: [measurement], lastMeasurement: measurement });
  await reclassifyMeasurements({
    orangeDelaySeconds: 600,
    redDelaySeconds: 900,
    orangeDelayPercent: 30,
    redDelayPercent: 60,
  }, storage);

  assert.equal(storage.data.lastMeasurement.status, "green");
  assert.equal(storage.data.lastMeasurement.durationSeconds, 1_800);
  assert.equal(storage.data.measurements[0].status, "green");
});
