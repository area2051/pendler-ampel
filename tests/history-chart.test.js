import test from "node:test";
import assert from "node:assert/strict";

import { buildChartModel } from "../sidepanel/history-chart.js";

test("buildChartModel returns two responsive SVG polylines over the supplied time range", () => {
  const model = buildChartModel([
    { observedAt: "2026-11-17T16:00:00.000Z", durationSeconds: 1_800, baselineSeconds: 1_500 },
    { observedAt: "2026-11-17T16:30:00.000Z", durationSeconds: 2_100, baselineSeconds: 1_500 },
    { observedAt: "2026-11-17T17:00:00.000Z", durationSeconds: 2_400, baselineSeconds: 1_560 },
  ], 600, 220);

  assert.equal(model.currentPoints.split(" ").length, 3);
  assert.equal(model.baselinePoints.split(" ").length, 3);
  assert.match(model.currentPoints, /^24,138\.7 /);
  assert.match(model.currentPoints, /576,24$/);
  assert.deepEqual(model.labels, { min: "25 min", max: "40 min" });
});

test("buildChartModel reports an empty model without measurements", () => {
  assert.deepEqual(buildChartModel([], 600, 220), null);
});
