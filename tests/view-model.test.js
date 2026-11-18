import test from "node:test";
import assert from "node:assert/strict";

import { buildPublicState } from "../shared/view-model.js";

test("buildPublicState exposes display data and a key-free Maps URL", () => {
  const publicState = buildPublicState({
    complete: true,
    verified: true,
    configuration: {
      routeLabel: "Nach Hause",
      origin: "START ADDRESS",
      destination: "DESTINATION ADDRESS",
      thresholds: {},
    },
    lastMeasurement: {
      observedAt: "2026-11-17T16:32:00.000Z",
      durationSeconds: 2_280,
      baselineSeconds: 1_740,
      delaySeconds: 540,
      distanceMeters: 27_400,
      status: "orange",
    },
    measurements: [
      { durationSeconds: 2_000 },
      { durationSeconds: 2_100 },
      { durationSeconds: 2_280 },
    ],
    runtimeState: { lastError: null },
  }, new Date("2026-11-17T16:33:00.000Z"));

  assert.equal(publicState.currentMinutes, 38);
  assert.equal(publicState.normalMinutes, 29);
  assert.equal(publicState.delayMinutes, 9);
  assert.equal(publicState.delayPercent, 31);
  assert.equal(publicState.trend, "increasing");
  assert.equal(publicState.stale, false);
  assert.match(publicState.routeUrl, /origin=START\+ADDRESS/);
  assert.doesNotMatch(JSON.stringify(publicState), /API_KEY|apiKey/);
});

test("buildPublicState marks data older than 15 minutes stale", () => {
  const state = buildPublicState({
    complete: true,
    verified: true,
    configuration: { routeLabel: "Nach Hause", origin: "A", destination: "B" },
    lastMeasurement: {
      observedAt: "2026-11-17T16:14:59.000Z",
      durationSeconds: 1_800,
      baselineSeconds: 1_800,
      delaySeconds: 0,
      distanceMeters: 1_000,
      status: "green",
    },
    measurements: [],
    runtimeState: {},
  }, new Date("2026-11-17T16:30:00.000Z"));

  assert.equal(state.stale, true);
  assert.equal(state.effectiveStatus, "gray");
});
