import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateDelay,
  calculateStatus,
} from "../domain/status-calculator.js";

const thresholds = {
  orangeDelaySeconds: 300,
  redDelaySeconds: 600,
  orangeDelayPercent: 15,
  redDelayPercent: 30,
};

test("calculateDelay preserves a faster-than-static signed difference", () => {
  assert.deepEqual(calculateDelay(1_500, 1_800), {
    delaySeconds: -300,
    delayPercent: -16.666666666666664,
  });
});

test("calculateDelay rejects a non-positive static duration", () => {
  assert.throws(() => calculateDelay(600, 0), /statische Fahrzeit/i);
});

test("calculateStatus uses exact orange and red minute boundaries", () => {
  assert.equal(calculateStatus({ delaySeconds: 299, delayPercent: 14 }, thresholds), "green");
  assert.equal(calculateStatus({ delaySeconds: 300, delayPercent: 14 }, thresholds), "orange");
  assert.equal(calculateStatus({ delaySeconds: 600, delayPercent: 1 }, thresholds), "red");
});

test("calculateStatus always applies the stricter percentage result", () => {
  assert.equal(calculateStatus({ delaySeconds: 60, delayPercent: 15 }, thresholds), "orange");
  assert.equal(calculateStatus({ delaySeconds: 60, delayPercent: 30 }, thresholds), "red");
});
