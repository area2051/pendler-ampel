import test from "node:test";
import assert from "node:assert/strict";

import { runButtonAction, startPeriodicReload } from "../shared/page-lifecycle.js";

test("runButtonAction re-enables the captured button after an asynchronous action", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const button = { disabled: false };

  const action = runButtonAction(button, () => gate);
  assert.equal(button.disabled, true);
  release();
  await action;

  assert.equal(button.disabled, false);
});

test("runButtonAction reports an error and still re-enables the button", async () => {
  const button = { disabled: false };
  let reported;

  await runButtonAction(
    button,
    async () => { throw new Error("failed"); },
    (error) => { reported = error.message; },
  );

  assert.equal(reported, "failed");
  assert.equal(button.disabled, false);
});

test("startPeriodicReload refreshes time-derived presentation every 30 seconds", async () => {
  let callback;
  let delay;
  let reloads = 0;
  const timer = startPeriodicReload(
    async () => { reloads += 1; },
    (handler, milliseconds) => { callback = handler; delay = milliseconds; return 42; },
  );

  assert.equal(timer, 42);
  assert.equal(delay, 30_000);
  callback();
  await Promise.resolve();
  assert.equal(reloads, 1);
});
