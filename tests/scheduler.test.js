import test from "node:test";
import assert from "node:assert/strict";

import {
  shouldAutomaticallyRefresh,
  shouldRefreshOnStartup,
  synchronizeAlarms,
} from "../background/scheduler.js";

const state = {
  complete: true,
  verified: true,
  configuration: {
    autoRefreshEnabled: true,
    intervalMinutes: 5,
    activeWeekdays: [2],
    startTime: "15:00",
    endTime: "19:00",
  },
};

test("automatic refresh requires complete verified active configuration", () => {
  const active = new Date(2026, 10, 17, 16, 0);
  assert.equal(shouldAutomaticallyRefresh(state, active), true);
  assert.equal(shouldAutomaticallyRefresh({ ...state, verified: false }, active), false);
  assert.equal(shouldAutomaticallyRefresh({ ...state, configuration: { ...state.configuration, autoRefreshEnabled: false } }, active), false);
  assert.equal(shouldAutomaticallyRefresh(state, new Date(2026, 10, 17, 20, 0)), false);
});

test("startup refreshes only missing or older-than-15-minute data", () => {
  const now = new Date(2026, 10, 17, 16, 0);
  assert.equal(shouldRefreshOnStartup(state, now), true);
  assert.equal(shouldRefreshOnStartup({ ...state, lastMeasurement: { observedAt: new Date(2026, 10, 17, 15, 45).toISOString() } }, now), false);
  assert.equal(shouldRefreshOnStartup({ ...state, lastMeasurement: { observedAt: new Date(2026, 10, 17, 15, 44, 59).toISOString() } }, now), true);
});

test("synchronizeAlarms preserves an existing matching refresh schedule", async () => {
  const calls = [];
  const alarms = {
    async get(name) {
      return name === "commute-refresh"
        ? { name, periodInMinutes: 5, scheduledTime: Date.parse("2026-11-17T16:05:00.000Z") }
        : undefined;
    },
    async clear(name) { calls.push(["clear", name]); },
    async create(name, details) { calls.push(["create", name, details]); },
  };

  await synchronizeAlarms(state, alarms, new Date("2026-11-17T16:04:00.000Z"));

  assert.deepEqual(calls, []);
});
