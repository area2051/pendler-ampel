import test from "node:test";
import assert from "node:assert/strict";

import {
  clearAllLocalData,
  deleteApiKey,
  isConfigurationComplete,
  isConfigurationVerified,
  loadConfigurationState,
  markConfigurationVerified,
  saveConfigurationState,
} from "../storage/configuration-store.js";
import { MemoryStorage } from "./test-helpers.js";

const completeInput = {
  routeLabel: "Feierabend",
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

test("route-affecting configuration changes invalidate verification", async () => {
  const storage = new MemoryStorage();
  const first = await saveConfigurationState(completeInput, storage);
  assert.equal(first.configuration.routeRevision, 1);
  assert.equal(first.verification.verifiedRouteRevision, null);

  await markConfigurationVerified(first.configuration, "2026-11-17T16:32:00.000Z", storage);
  const scheduleOnly = await saveConfigurationState({ ...completeInput, intervalMinutes: 10 }, storage);
  assert.equal(scheduleOnly.configuration.routeRevision, 1);
  assert.equal(scheduleOnly.verification.verifiedRouteRevision, 1);

  const routeChange = await saveConfigurationState({ ...completeInput, avoidTolls: true }, storage);
  assert.equal(routeChange.configuration.routeRevision, 2);
  assert.equal(routeChange.verification.verifiedRouteRevision, null);
});

test("configuration is complete and verified only with credentials and matching revision", async () => {
  const storage = new MemoryStorage();
  const empty = await loadConfigurationState(storage);
  assert.equal(isConfigurationComplete(empty), false);

  const saved = await saveConfigurationState(completeInput, storage);
  assert.equal(isConfigurationComplete(saved), true);
  assert.equal(isConfigurationVerified(saved), false);

  await markConfigurationVerified(saved.configuration, "2026-11-17T16:32:00.000Z", storage);
  assert.equal(isConfigurationVerified(await loadConfigurationState(storage)), true);
});

test("deleteApiKey invalidates verification but preserves other local state", async () => {
  const storage = new MemoryStorage();
  const saved = await saveConfigurationState(completeInput, storage);
  await markConfigurationVerified(saved.configuration, "2026-11-17T16:32:00.000Z", storage);
  storage.data.measurements = [{ observedAt: "2026-11-17T16:32:00.000Z" }];

  await deleteApiKey(storage);
  const state = await loadConfigurationState(storage);
  assert.equal(state.credentials.apiKey, "");
  assert.equal(state.verification.verifiedRouteRevision, null);
  assert.equal(storage.data.measurements.length, 1);
});

test("saveConfigurationState stores the API key only in credentials", async () => {
  const storage = new MemoryStorage();

  await saveConfigurationState(completeInput, storage);

  assert.equal(storage.data.credentials.apiKey, "TEST_API_KEY");
  assert.equal(Object.hasOwn(storage.data.configuration, "apiKey"), false);
});

test("loadConfigurationState removes a duplicated API key from existing configuration data", async () => {
  const storage = new MemoryStorage({
    configuration: { ...completeInput, routeRevision: 1 },
    credentials: { apiKey: "TEST_API_KEY" },
  });

  const state = await loadConfigurationState(storage);

  assert.equal(state.credentials.apiKey, "TEST_API_KEY");
  assert.equal(Object.hasOwn(state.configuration, "apiKey"), false);
  assert.equal(Object.hasOwn(storage.data.configuration, "apiKey"), false);
});

test("deleteApiKey removes every copy from previously affected storage", async () => {
  const storage = new MemoryStorage({
    configuration: { ...completeInput, routeRevision: 1 },
    credentials: { apiKey: "TEST_API_KEY" },
    verification: { verifiedRouteRevision: 1, verifiedAt: "2026-11-17T16:32:00.000Z" },
  });

  await deleteApiKey(storage);

  assert.equal(storage.data.credentials.apiKey, "");
  assert.equal(Object.hasOwn(storage.data.configuration, "apiKey"), false);
});

test("saveConfigurationState rejects intervals outside 5 to 15 minutes", async () => {
  await assert.rejects(
    saveConfigurationState({ ...completeInput, intervalMinutes: 16 }, new MemoryStorage()),
    /5 und 15 Minuten/i,
  );
});

test("changing the measured route clears measurements from the previous route", async () => {
  const storage = new MemoryStorage();
  await saveConfigurationState(completeInput, storage);
  storage.data.measurements = [{ observedAt: "2026-11-17T16:32:00.000Z" }];
  storage.data.lastMeasurement = storage.data.measurements[0];

  await saveConfigurationState({ ...completeInput, origin: "OTHER_START_ADDRESS" }, storage);

  assert.deepEqual(storage.data.measurements, []);
  assert.equal(storage.data.lastMeasurement, null);
});

test("clearing all data wins over a concurrent legacy configuration migration", async () => {
  let migrationReadStarted;
  let releaseMigrationRead;
  const readStarted = new Promise((resolve) => { migrationReadStarted = resolve; });
  const readGate = new Promise((resolve) => { releaseMigrationRead = resolve; });

  class PausingLegacyStorage extends MemoryStorage {
    async get(keys = null) {
      const snapshot = await super.get(keys);
      if (Array.isArray(keys) && keys.includes("configuration")) {
        migrationReadStarted();
        await readGate;
      }
      return snapshot;
    }
  }

  const storage = new PausingLegacyStorage({
    configuration: { ...completeInput, apiKey: "TEST_API_KEY", routeRevision: 1 },
    credentials: { apiKey: "TEST_API_KEY" },
  });
  const load = loadConfigurationState(storage);
  await readStarted;
  const clear = clearAllLocalData(storage);
  releaseMigrationRead();
  await Promise.all([load, clear]);

  assert.deepEqual(storage.data, {});
});

test("saveConfigurationState rejects non-finite notification thresholds", async () => {
  await assert.rejects(
    saveConfigurationState({
      ...completeInput,
      thresholds: { ...completeInput.thresholds, cooldownMinutes: "not-a-number" },
    }, new MemoryStorage()),
    /Abklingzeit/i,
  );
});
