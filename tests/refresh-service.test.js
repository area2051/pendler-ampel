import test from "node:test";
import assert from "node:assert/strict";

import { createRefreshService } from "../background/refresh-service.js";
import {
  clearAllLocalData,
  loadConfigurationState,
  saveConfigurationState,
} from "../storage/configuration-store.js";
import { MemoryStorage } from "./test-helpers.js";

const candidate = {
  routeLabel: "Nach Hause",
  apiKey: "TEST_API_KEY",
  origin: "START_ADDRESS",
  destination: "DESTINATION_ADDRESS",
  intervalMinutes: 5,
  activeWeekdays: [1, 2, 3, 4, 5],
  startTime: "15:00",
  endTime: "19:00",
  autoRefreshEnabled: true,
  notificationsEnabled: true,
  recoveryNotificationsEnabled: false,
  avoidTolls: false,
  avoidHighways: false,
  avoidFerries: false,
  thresholds: {
    orangeDelaySeconds: 300,
    redDelaySeconds: 600,
    orangeDelayPercent: 15,
    redDelayPercent: 30,
    repeatIncreaseSeconds: 300,
    cooldownMinutes: 30,
  },
};

test("test refresh saves the candidate, performs one request and verifies its revision", async () => {
  const storage = new MemoryStorage();
  let calls = 0;
  const service = createRefreshService({
    storageArea: storage,
    now: () => new Date("2026-11-17T16:32:00.000Z"),
    fetchRouteImpl: async (configuration) => {
      calls += 1;
      assert.equal(configuration.apiKey, "TEST_API_KEY");
      return { durationSeconds: 2_280, baselineSeconds: 1_740, distanceMeters: 27_400 };
    },
  });

  const result = await service.refresh({ source: "test", candidateConfiguration: candidate });
  const state = await loadConfigurationState(storage);

  assert.equal(calls, 1);
  assert.equal(result.measurement.status, "red");
  assert.equal(state.verification.verifiedRouteRevision, state.configuration.routeRevision);
  assert.equal(storage.data.apiUsage.totalCalls, 1);
  assert.equal(storage.data.apiUsage.entries[0].source, "test");
  assert.equal(storage.data.apiUsage.entries[0].outcome, "success");
});

test("manual refresh does not call Google before successful verification", async () => {
  const storage = new MemoryStorage();
  await saveConfigurationState(candidate, storage);
  let calls = 0;
  const service = createRefreshService({
    storageArea: storage,
    fetchRouteImpl: async () => { calls += 1; },
  });

  await assert.rejects(service.refresh({ source: "manual" }), (error) => error.code === "NOT_VERIFIED");
  assert.equal(calls, 0);
  assert.equal(storage.data.apiUsage, undefined);
});

test("refresh rejects a concurrent request without creating a second fetch", async () => {
  const storage = new MemoryStorage();
  let release;
  let calls = 0;
  const deferred = new Promise((resolve) => { release = resolve; });
  const service = createRefreshService({
    storageArea: storage,
    fetchRouteImpl: async () => {
      calls += 1;
      await deferred;
      return { durationSeconds: 2_280, baselineSeconds: 1_740, distanceMeters: 27_400 };
    },
  });

  const first = service.refresh({ source: "test", candidateConfiguration: candidate });
  await assert.rejects(service.refresh({ source: "test", candidateConfiguration: candidate }), (error) => error.code === "REFRESH_IN_PROGRESS");
  release();
  await first;
  assert.equal(calls, 1);
  assert.equal(storage.data.apiUsage.totalCalls, 1);
});

test("failed refresh stores a safe error and preserves the last successful measurement", async () => {
  const storage = new MemoryStorage();
  await saveConfigurationState(candidate, storage);
  storage.data.lastMeasurement = { observedAt: "2026-11-17T16:00:00.000Z", durationSeconds: 2_000 };
  const service = createRefreshService({
    storageArea: storage,
    fetchRouteImpl: async () => { throw Object.assign(new Error("TEST_API_KEY leaked"), { code: "NETWORK_ERROR" }); },
  });

  await assert.rejects(service.refresh({ source: "test", candidateConfiguration: candidate }));
  assert.equal(storage.data.lastMeasurement.durationSeconds, 2_000);
  assert.equal(storage.data.runtimeState.lastError.code, "NETWORK_ERROR");
  assert.equal(storage.data.runtimeState.lastError.message.includes("TEST_API_KEY"), false);
  assert.equal(storage.data.apiUsage.totalCalls, 1);
  assert.equal(storage.data.apiUsage.entries[0].outcome, "error");
  assert.equal(storage.data.apiUsage.entries[0].errorCode, "NETWORK_ERROR");
});

test("successful Google response stays successful when local measurement storage fails", async () => {
  class FailingMeasurementStorage extends MemoryStorage {
    async set(values) {
      if (values.lastMeasurement?.durationSeconds) throw new Error("local storage failed");
      await super.set(values);
    }
  }
  const storage = new FailingMeasurementStorage();
  const service = createRefreshService({
    storageArea: storage,
    fetchRouteImpl: async () => ({ durationSeconds: 2_280, baselineSeconds: 1_740, distanceMeters: 27_400 }),
  });

  await assert.rejects(service.refresh({ source: "test", candidateConfiguration: candidate }));

  assert.equal(storage.data.apiUsage.entries[0].outcome, "success");
  assert.equal(storage.data.apiUsage.entries[0].errorCode, undefined);
});

test("clearing all data wins over an API log completion already reading storage", async () => {
  let completionReadStarted;
  let releaseCompletionRead;
  const completionRead = new Promise((resolve) => { completionReadStarted = resolve; });
  const completionGate = new Promise((resolve) => { releaseCompletionRead = resolve; });

  class PausingUsageStorage extends MemoryStorage {
    usageReads = 0;

    async get(keys = null) {
      const snapshot = await super.get(keys);
      if (keys === "apiUsage" && ++this.usageReads === 2) {
        completionReadStarted();
        await completionGate;
      }
      return snapshot;
    }
  }

  const storage = new PausingUsageStorage();
  const service = createRefreshService({
    storageArea: storage,
    fetchRouteImpl: async () => ({ durationSeconds: 2_280, baselineSeconds: 1_740, distanceMeters: 27_400 }),
  });

  const refresh = service.refresh({ source: "test", candidateConfiguration: candidate });
  await completionRead;
  const clear = clearAllLocalData(storage);
  releaseCompletionRead();
  await Promise.allSettled([refresh, clear]);

  assert.deepEqual(storage.data, {});
});

test("an old route test cannot verify or populate a new route after data was cleared", async () => {
  let requestStarted;
  let releaseRequest;
  const started = new Promise((resolve) => { requestStarted = resolve; });
  const requestGate = new Promise((resolve) => { releaseRequest = resolve; });
  const storage = new MemoryStorage();
  const service = createRefreshService({
    storageArea: storage,
    fetchRouteImpl: async () => {
      requestStarted();
      await requestGate;
      return { durationSeconds: 2_280, baselineSeconds: 1_740, distanceMeters: 27_400 };
    },
  });

  const oldRefresh = service.refresh({ source: "test", candidateConfiguration: candidate });
  await started;
  await clearAllLocalData(storage);
  await saveConfigurationState({
    ...candidate,
    apiKey: "NEW_API_KEY",
    origin: "NEW_START_ADDRESS",
    destination: "NEW_DESTINATION_ADDRESS",
  }, storage);
  releaseRequest();

  await assert.rejects(oldRefresh, (error) => error.code === "REFRESH_INVALIDATED");
  const state = await loadConfigurationState(storage);
  assert.equal(state.verification.verifiedRouteRevision, null);
  assert.deepEqual(storage.data.measurements, []);
  assert.equal(storage.data.lastMeasurement, null);
});

test("post-refresh work is rejected after a newer configuration mutation was queued", async () => {
  const storage = new MemoryStorage();
  const service = createRefreshService({
    storageArea: storage,
    fetchRouteImpl: async () => ({ durationSeconds: 2_280, baselineSeconds: 1_740, distanceMeters: 27_400 }),
  });
  const result = await service.refresh({ source: "test", candidateConfiguration: candidate });
  let postProcessingRan = false;

  const save = saveConfigurationState({ ...candidate, origin: "NEW_START_ADDRESS" }, storage);
  const postProcessing = service.runIfCurrent(result, async () => { postProcessingRan = true; });
  await save;

  await assert.rejects(postProcessing, (error) => error.code === "REFRESH_INVALIDATED");
  assert.equal(postProcessingRan, false);
});
