import test from "node:test";
import assert from "node:assert/strict";

import { fetchRoute } from "../api/google-routes-client.js";

const configuration = {
  apiKey: "TEST_API_KEY",
  origin: "START_ADDRESS",
  destination: "DESTINATION_ADDRESS",
  avoidTolls: true,
  avoidHighways: false,
  avoidFerries: true,
};

test("fetchRoute sends a departure time 60 seconds in the future", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({
      routes: [{ duration: "2280s", staticDuration: "1740s", distanceMeters: 27400 }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await fetchRoute(configuration, {
    fetchImpl,
    now: () => new Date("2026-11-17T16:32:00.000Z"),
  });

  assert.deepEqual(result, {
    durationSeconds: 2280,
    baselineSeconds: 1740,
    distanceMeters: 27400,
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://routes.googleapis.com/directions/v2:computeRoutes");
  assert.equal(requests[0].options.headers["X-Goog-Api-Key"], "TEST_API_KEY");
  assert.equal(
    requests[0].options.headers["X-Goog-FieldMask"],
    "routes.duration,routes.staticDuration,routes.distanceMeters",
  );
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    origin: { address: "START_ADDRESS" },
    destination: { address: "DESTINATION_ADDRESS" },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE_OPTIMAL",
    trafficModel: "BEST_GUESS",
    computeAlternativeRoutes: false,
    languageCode: "de-DE",
    units: "METRIC",
    departureTime: "2026-11-17T16:33:00.000Z",
    routeModifiers: {
      avoidTolls: true,
      avoidHighways: false,
      avoidFerries: true,
    },
  });
});

for (const [status, expectedCode] of [[400, "INVALID_ROUTE"], [401, "AUTH_REJECTED"], [403, "AUTH_REJECTED"], [429, "QUOTA_EXCEEDED"]]) {
  test(`fetchRoute maps HTTP ${status} without exposing response details`, async () => {
    const fetchImpl = async () => new Response(JSON.stringify({ error: { message: "TEST_API_KEY secret" } }), { status });

    await assert.rejects(
      fetchRoute(configuration, { fetchImpl }),
      (error) => error.code === expectedCode && !error.message.includes("TEST_API_KEY"),
    );
  });
}

test("fetchRoute rejects a successful response without a route", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ routes: [] }), { status: 200 });

  await assert.rejects(
    fetchRoute(configuration, { fetchImpl }),
    (error) => error.code === "NO_ROUTE",
  );
});

test("fetchRoute maps malformed JSON to an invalid response", async () => {
  const fetchImpl = async () => new Response("not json", { status: 200 });

  await assert.rejects(
    fetchRoute(configuration, { fetchImpl }),
    (error) => error.code === "INVALID_RESPONSE",
  );
});

test("fetchRoute aborts a request after the configured timeout", async () => {
  const fetchImpl = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });

  await assert.rejects(
    fetchRoute(configuration, { fetchImpl, timeoutMs: 1 }),
    (error) => error.code === "TIMEOUT",
  );
});
