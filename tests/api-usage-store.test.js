import test from "node:test";
import assert from "node:assert/strict";

import {
  loadApiUsage,
  recordApiCallFinished,
  recordApiCallStarted,
} from "../storage/api-usage-store.js";
import { MemoryStorage } from "./test-helpers.js";

test("recordApiCallStarted increments the durable total and stores only safe metadata", async () => {
  const storage = new MemoryStorage();

  await recordApiCallStarted({
    attemptedAt: "2026-11-17T16:32:00.000Z",
    source: "manual",
    apiKey: "TEST_API_KEY",
    origin: "START_ADDRESS",
  }, storage);

  const usage = await loadApiUsage(storage);
  assert.equal(usage.totalCalls, 1);
  assert.deepEqual(usage.entries[0], {
    attemptedAt: "2026-11-17T16:32:00.000Z",
    source: "manual",
    outcome: "pending",
  });
  assert.doesNotMatch(JSON.stringify(usage), /TEST_API_KEY|START_ADDRESS|apiKey|origin/);
});

test("recordApiCallFinished records success or a safe error code", async () => {
  const storage = new MemoryStorage();
  const entry = await recordApiCallStarted({ attemptedAt: "2026-11-17T16:32:00.000Z", source: "test" }, storage);

  await recordApiCallFinished(entry, { outcome: "error", errorCode: "AUTH_REJECTED", message: "secret" }, storage);

  const usage = await loadApiUsage(storage);
  assert.deepEqual(usage.entries[0], {
    attemptedAt: "2026-11-17T16:32:00.000Z",
    source: "test",
    outcome: "error",
    errorCode: "AUTH_REJECTED",
  });
});

test("API usage keeps a lifetime total but only the newest 100 entries", async () => {
  const storage = new MemoryStorage();
  for (let index = 0; index < 101; index += 1) {
    await recordApiCallStarted({
      attemptedAt: new Date(Date.parse("2026-11-17T16:00:00.000Z") + index * 1_000).toISOString(),
      source: "alarm",
    }, storage);
  }

  const usage = await loadApiUsage(storage);
  assert.equal(usage.totalCalls, 101);
  assert.equal(usage.entries.length, 100);
  assert.equal(usage.entries[0].attemptedAt, "2026-11-17T16:00:01.000Z");
  assert.equal(usage.entries.at(-1).attemptedAt, "2026-11-17T16:01:40.000Z");
});

test("recordApiCallFinished replaces unrecognized error codes with UNKNOWN", async () => {
  const storage = new MemoryStorage();
  const entry = await recordApiCallStarted({ attemptedAt: "2026-11-17T16:32:00.000Z", source: "test" }, storage);

  await recordApiCallFinished(entry, { outcome: "error", errorCode: "TEST_API_KEY" }, storage);

  const usage = await loadApiUsage(storage);
  assert.equal(usage.entries[0].errorCode, "UNKNOWN");
  assert.doesNotMatch(JSON.stringify(usage), /TEST_API_KEY/);
});

test("loadApiUsage persistently removes legacy fields, invalid timestamps and excess entries", async () => {
  const entries = Array.from({ length: 101 }, (_, index) => ({
    id: `legacy-${index}`,
    arbitrary: "remove-me",
    attemptedAt: new Date(Date.parse("2026-11-17T16:00:00.000Z") + index * 1_000).toISOString(),
    source: "manual",
    outcome: "success",
  }));
  entries.push({ id: "invalid", attemptedAt: "invalid", source: "manual", outcome: "success" });
  entries.push(null);
  const storage = new MemoryStorage({ apiUsage: { totalCalls: 103, entries } });

  const usage = await loadApiUsage(storage);

  assert.equal(usage.entries.length, 100);
  assert.deepEqual(storage.data.apiUsage, usage);
  assert.doesNotMatch(JSON.stringify(storage.data.apiUsage), /legacy-|arbitrary|remove-me|invalid/);
});
