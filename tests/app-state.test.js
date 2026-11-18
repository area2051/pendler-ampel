import test from "node:test";
import assert from "node:assert/strict";

import { buildOptionsState, loadApplicationState } from "../shared/app-state.js";
import { MemoryStorage } from "./test-helpers.js";

test("options state exposes local API usage without exposing it in configuration", async () => {
  const storage = new MemoryStorage({
    apiUsage: {
      totalCalls: 3,
      entries: [{ id: "entry-3", attemptedAt: "2026-11-17T16:32:00.000Z", source: "manual", outcome: "success" }],
    },
  });

  const options = buildOptionsState(await loadApplicationState(storage));

  assert.equal(options.apiUsage.totalCalls, 3);
  assert.equal(options.apiUsage.entries[0].outcome, "success");
});
