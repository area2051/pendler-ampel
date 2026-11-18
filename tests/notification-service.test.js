import test from "node:test";
import assert from "node:assert/strict";

import { decideNotification } from "../background/notification-service.js";

const configuration = {
  notificationsEnabled: true,
  recoveryNotificationsEnabled: false,
  thresholds: { repeatIncreaseSeconds: 300, cooldownMinutes: 30 },
};
const red = (durationSeconds) => ({ status: "red", durationSeconds, baselineSeconds: 1_800 });
const green = { status: "green", durationSeconds: 1_900, baselineSeconds: 1_800 };
const initialState = {
  lastObservedStatus: null,
  redEpisodeWarned: false,
  lastWarningAt: null,
  lastWarnedDurationSeconds: null,
};

test("first eligible red measurement emits one warning", () => {
  const result = decideNotification({
    measurement: red(2_700), configuration, state: initialState,
    now: new Date("2026-11-17T17:00:00.000Z"), eligible: true,
  });

  assert.equal(result.notification.kind, "warning");
  assert.equal(result.state.redEpisodeWarned, true);
});

test("unchanged red measurements do not repeat a warning", () => {
  const state = {
    lastObservedStatus: "red", redEpisodeWarned: true,
    lastWarningAt: "2026-11-17T16:00:00.000Z", lastWarnedDurationSeconds: 2_700,
  };
  const result = decideNotification({
    measurement: red(2_700), configuration, state,
    now: new Date("2026-11-17T17:00:00.000Z"), eligible: true,
  });
  assert.equal(result.notification, null);
});

test("red warning repeats only after both deterioration and cooldown", () => {
  const state = {
    lastObservedStatus: "red", redEpisodeWarned: true,
    lastWarningAt: "2026-11-17T16:45:00.000Z", lastWarnedDurationSeconds: 2_700,
  };
  const duringCooldown = decideNotification({
    measurement: red(3_000), configuration, state,
    now: new Date("2026-11-17T17:00:00.000Z"), eligible: true,
  });
  assert.equal(duringCooldown.notification, null);

  const afterCooldown = decideNotification({
    measurement: red(3_000), configuration, state,
    now: new Date("2026-11-17T17:20:00.000Z"), eligible: true,
  });
  assert.equal(afterCooldown.notification.kind, "warning");
});

test("red transition during cooldown remains pending until a later red measurement", () => {
  const state = {
    lastObservedStatus: "green", redEpisodeWarned: false,
    lastWarningAt: "2026-11-17T16:45:00.000Z", lastWarnedDurationSeconds: null,
  };
  const pending = decideNotification({
    measurement: red(2_700), configuration, state,
    now: new Date("2026-11-17T17:00:00.000Z"), eligible: true,
  });
  assert.equal(pending.notification, null);
  assert.equal(pending.state.redEpisodeWarned, false);

  const emitted = decideNotification({
    measurement: red(2_700), configuration, state: pending.state,
    now: new Date("2026-11-17T17:20:00.000Z"), eligible: true,
  });
  assert.equal(emitted.notification.kind, "warning");
});

test("configured recovery notification is emitted once outside cooldown", () => {
  const state = {
    lastObservedStatus: "red", redEpisodeWarned: true,
    lastWarningAt: "2026-11-17T16:00:00.000Z", lastWarnedDurationSeconds: 2_700,
  };
  const result = decideNotification({
    measurement: green,
    configuration: { ...configuration, recoveryNotificationsEnabled: true },
    state,
    now: new Date("2026-11-17T17:00:00.000Z"), eligible: true,
  });
  assert.equal(result.notification.kind, "recovery");
  assert.equal(result.state.redEpisodeWarned, false);
});

test("test, stale, error, disabled or out-of-window states are ineligible", () => {
  const result = decideNotification({
    measurement: red(2_700), configuration, state: initialState,
    now: new Date("2026-11-17T17:00:00.000Z"), eligible: false,
  });
  assert.equal(result.notification, null);
  assert.deepEqual(result.state, initialState);
});
