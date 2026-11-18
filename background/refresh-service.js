import { ApiError, publicError } from "../api/api-error.js";
import { fetchRoute } from "../api/google-routes-client.js";
import { createMeasurement } from "../domain/commute-measurement.js";
import {
  isConfigurationComplete,
  isConfigurationVerified,
  loadConfigurationState,
  markConfigurationVerified,
  saveConfigurationState,
} from "../storage/configuration-store.js";
import { appendMeasurement } from "../storage/measurement-store.js";
import { loadRuntimeState, saveRuntimeState } from "../storage/runtime-store.js";
import { validateConfiguration } from "../shared/validation.js";
import { recordApiCallFinished, recordApiCallStarted } from "../storage/api-usage-store.js";
import { runStorageMutation } from "../storage/storage-mutation-coordinator.js";

function sameRouteIdentity(expected, current) {
  return expected.routeRevision === current.routeRevision
    && expected.routeGeneration === current.routeGeneration;
}

export function createRefreshService({
  storageArea = chrome.storage.local,
  fetchRouteImpl = fetchRoute,
  now = () => new Date(),
} = {}) {
  let inFlight = false;
  let refreshGeneration = 0;

  function invalidatedError() {
    return new ApiError("REFRESH_INVALIDATED");
  }

  function assertNotInvalidated(startGeneration) {
    if (startGeneration !== refreshGeneration) throw invalidatedError();
  }

  async function isCurrent(configuration, startGeneration, mutationContext) {
    if (startGeneration !== refreshGeneration) return false;
    const current = await loadConfigurationState(storageArea, mutationContext);
    return sameRouteIdentity(configuration, current.configuration);
  }

  function safeError(error) {
    return error instanceof ApiError
      ? publicError(error)
      : publicError(error?.code ? new ApiError(error.code) : error);
  }

  async function run({ source, candidateConfiguration }) {
    const startGeneration = refreshGeneration;
    let configurationState;
    if (source === "test") {
      configurationState = await saveConfigurationState(candidateConfiguration, storageArea);
      assertNotInvalidated(startGeneration);
      const validationErrors = validateConfiguration(configurationState.configuration, { requireRoute: true });
      if (!configurationState.credentials.apiKey.trim() || validationErrors.length > 0) {
        throw new ApiError("INCOMPLETE_CONFIGURATION");
      }
    } else {
      configurationState = await loadConfigurationState(storageArea);
      if (!isConfigurationComplete(configurationState)) {
        throw new ApiError("INCOMPLETE_CONFIGURATION");
      }
      if (!isConfigurationVerified(configurationState)) {
        throw new ApiError("NOT_VERIFIED");
      }
    }

    const attemptedAt = now();
    let previousRuntime;
    let apiCall;
    let routePromise;
    await runStorageMutation(async (mutationContext) => {
      assertNotInvalidated(startGeneration);
      if (!await isCurrent(configurationState.configuration, startGeneration, mutationContext)) throw invalidatedError();
      previousRuntime = await loadRuntimeState(storageArea);
      await saveRuntimeState({
        ...previousRuntime,
        lastFetchAttemptAt: attemptedAt.toISOString(),
      }, storageArea, mutationContext);
      apiCall = await recordApiCallStarted({
        attemptedAt: attemptedAt.toISOString(),
        source,
      }, storageArea, mutationContext);
      assertNotInvalidated(startGeneration);
      try {
        routePromise = Promise.resolve(fetchRouteImpl({
          ...configurationState.configuration,
          apiKey: configurationState.credentials.apiKey,
        }));
      } catch (error) {
        routePromise = Promise.reject(error);
      }
    });

    let route;
    try {
      route = await routePromise;
    } catch (error) {
      const safe = safeError(error);
      const current = await runStorageMutation(async (mutationContext) => {
        await recordApiCallFinished(apiCall, {
          outcome: "error",
          errorCode: safe.code,
        }, storageArea, mutationContext);
        if (!await isCurrent(configurationState.configuration, startGeneration, mutationContext)) return false;
        await saveRuntimeState({
          ...previousRuntime,
          lastFetchAttemptAt: attemptedAt.toISOString(),
          lastError: { ...safe, occurredAt: now().toISOString() },
        }, storageArea, mutationContext);
        return true;
      });
      if (!current) throw invalidatedError();
      throw error instanceof ApiError ? error : new ApiError(safe.code);
    }

    const observedAt = now();
    let measurement;
    try {
      const committed = await runStorageMutation(async (mutationContext) => {
        await recordApiCallFinished(apiCall, { outcome: "success" }, storageArea, mutationContext);
        if (!await isCurrent(configurationState.configuration, startGeneration, mutationContext)) return false;
        measurement = createMeasurement(route, observedAt, configurationState.configuration.thresholds);
        await appendMeasurement(measurement, storageArea, observedAt, mutationContext);
        if (source === "test") {
          await markConfigurationVerified(
            configurationState.configuration,
            observedAt.toISOString(),
            storageArea,
            mutationContext,
          );
        }
        await saveRuntimeState({
          lastFetchAttemptAt: attemptedAt.toISOString(),
          lastSuccessfulFetchAt: observedAt.toISOString(),
          lastError: null,
        }, storageArea, mutationContext);
        return true;
      });
      if (!committed) throw invalidatedError();
      assertNotInvalidated(startGeneration);
      return {
        measurement,
        source,
        configuration: configurationState.configuration,
        refreshGeneration: startGeneration,
      };
    } catch (error) {
      if (error instanceof ApiError && error.code === "REFRESH_INVALIDATED") throw error;
      const safe = safeError(error);
      await runStorageMutation(async (mutationContext) => {
        if (!await isCurrent(configurationState.configuration, startGeneration, mutationContext)) return;
        await saveRuntimeState({
          ...previousRuntime,
          lastFetchAttemptAt: attemptedAt.toISOString(),
          lastError: { ...safe, occurredAt: now().toISOString() },
        }, storageArea, mutationContext);
      });
      throw error instanceof ApiError ? error : new ApiError(safe.code);
    }
  }

  return {
    invalidate() {
      refreshGeneration += 1;
    },
    async refresh(request) {
      if (inFlight) {
        throw new ApiError("REFRESH_IN_PROGRESS");
      }
      inFlight = true;
      try {
        return await run(request);
      } finally {
        inFlight = false;
      }
    },
    runIfCurrent(result, operation) {
      return runStorageMutation(async (mutationContext) => {
        if (!await isCurrent(result.configuration, result.refreshGeneration, mutationContext)) {
          throw invalidatedError();
        }
        return operation(mutationContext);
      });
    },
  };
}
