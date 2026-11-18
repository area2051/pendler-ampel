import { ApiError } from "./api-error.js";
import { mapRouteResponse } from "./route-mapper.js";
import { ROUTES_ENDPOINT, ROUTES_FIELD_MASK } from "../shared/constants.js";

const DEPARTURE_TIME_BUFFER_MS = 60_000;

function mapHttpError(status) {
  if (status === 400) return new ApiError("INVALID_ROUTE");
  if (status === 401 || status === 403) return new ApiError("AUTH_REJECTED");
  if (status === 429) return new ApiError("QUOTA_EXCEEDED");
  return new ApiError("NETWORK_ERROR");
}

export async function fetchRoute(configuration, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const requestBody = {
    origin: { address: configuration.origin },
    destination: { address: configuration.destination },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE_OPTIMAL",
    trafficModel: "BEST_GUESS",
    computeAlternativeRoutes: false,
    languageCode: "de-DE",
    units: "METRIC",
    departureTime: new Date(now().getTime() + DEPARTURE_TIME_BUFFER_MS).toISOString(),
    routeModifiers: {
      avoidTolls: Boolean(configuration.avoidTolls),
      avoidHighways: Boolean(configuration.avoidHighways),
      avoidFerries: Boolean(configuration.avoidFerries),
    },
  };

  try {
    const response = await fetchImpl(ROUTES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": configuration.apiKey,
        "X-Goog-FieldMask": ROUTES_FIELD_MASK,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw mapHttpError(response.status);
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError("INVALID_RESPONSE");
    }
    return mapRouteResponse(payload);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error?.name === "AbortError") {
      throw new ApiError("TIMEOUT");
    }
    throw new ApiError("NETWORK_ERROR");
  } finally {
    clearTimeout(timer);
  }
}
