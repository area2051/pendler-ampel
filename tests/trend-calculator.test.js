import test from "node:test";
import assert from "node:assert/strict";

import { calculateTrend } from "../domain/trend-calculator.js";

const measurement = (durationSeconds) => ({ durationSeconds });

test("calculateTrend is unknown with fewer than three valid measurements", () => {
  assert.equal(calculateTrend([measurement(1_800), measurement(2_000)]), "unknown");
});

test("calculateTrend compares the newest with the oldest of the last three values", () => {
  const history = [
    measurement(900),
    measurement(1_800),
    measurement(1_850),
    measurement(1_980),
  ];

  assert.equal(calculateTrend(history), "increasing");
});

test("calculateTrend treats exact plus or minus three minutes as a trend", () => {
  assert.equal(
    calculateTrend([measurement(1_800), measurement(1_700), measurement(1_980)]),
    "increasing",
  );
  assert.equal(
    calculateTrend([measurement(1_800), measurement(1_900), measurement(1_620)]),
    "decreasing",
  );
});

test("calculateTrend is stable inside the three-minute boundary", () => {
  assert.equal(
    calculateTrend([measurement(1_800), measurement(1_700), measurement(1_979)]),
    "stable",
  );
});
