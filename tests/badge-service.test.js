import test from "node:test";
import assert from "node:assert/strict";

import { getBadgePresentation } from "../background/badge-service.js";

const now = new Date("2026-11-17T18:00:00.000Z");

test("badge shows setup state until configuration is verified", () => {
  assert.deepEqual(getBadgePresentation({ complete: false, verified: false }, now), {
    text: "--",
    color: "#7E57C2",
    title: "Pendler-Ampel – Einrichtung erforderlich",
  });
});

test("badge caps long duration text and uses the traffic status color", () => {
  const result = getBadgePresentation({
    complete: true,
    verified: true,
    lastMeasurement: { observedAt: "2026-11-17T17:59:00.000Z", durationSeconds: 7_000, status: "red" },
  }, now);

  assert.equal(result.text, "99+");
  assert.equal(result.color, "#D93025");
});

test("badge turns gray only after the successful measurement is older than 15 minutes", () => {
  const base = {
    complete: true,
    verified: true,
    lastMeasurement: { observedAt: "2026-11-17T17:44:59.000Z", durationSeconds: 2_280, status: "red" },
    lastError: { code: "NETWORK_ERROR" },
  };
  assert.equal(getBadgePresentation(base, now).color, "#5F6368");

  base.lastMeasurement.observedAt = "2026-11-17T17:45:00.000Z";
  assert.equal(getBadgePresentation(base, now).color, "#D93025");
});
