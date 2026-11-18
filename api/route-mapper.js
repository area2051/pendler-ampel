import { ApiError } from "./api-error.js";

function parseDuration(value) {
  const match = /^(-?\d+(?:\.\d+)?)s$/.exec(value ?? "");
  if (!match) {
    throw new ApiError("INVALID_RESPONSE");
  }
  return Math.round(Number(match[1]));
}

export function mapRouteResponse(payload) {
  const route = payload?.routes?.[0];
  if (!route) {
    throw new ApiError("NO_ROUTE");
  }

  const durationSeconds = parseDuration(route.duration);
  const baselineSeconds = parseDuration(route.staticDuration);
  const distanceMeters = Number(route.distanceMeters);
  if (durationSeconds < 0 || baselineSeconds <= 0 || !Number.isFinite(distanceMeters) || distanceMeters < 0) {
    throw new ApiError("INVALID_RESPONSE");
  }
  return { durationSeconds, baselineSeconds, distanceMeters };
}
