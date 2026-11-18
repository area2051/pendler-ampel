import {
  isConfigurationComplete,
  isConfigurationVerified,
  loadConfigurationState,
} from "../storage/configuration-store.js";
import { loadMeasurements } from "../storage/measurement-store.js";
import { loadRuntimeState } from "../storage/runtime-store.js";
import { loadApiUsage } from "../storage/api-usage-store.js";

export async function loadApplicationState(storageArea = chrome.storage.local, mutationContext) {
  const [configurationState, measurementState, runtimeState, apiUsage] = await Promise.all([
    loadConfigurationState(storageArea, mutationContext),
    loadMeasurements(storageArea, new Date(), mutationContext),
    loadRuntimeState(storageArea),
    loadApiUsage(storageArea, mutationContext),
  ]);
  return {
    ...configurationState,
    ...measurementState,
    runtimeState,
    apiUsage,
    complete: isConfigurationComplete(configurationState),
    verified: isConfigurationVerified(configurationState),
  };
}

export function buildOptionsState(applicationState) {
  return {
    ...applicationState.configuration,
    apiKey: applicationState.credentials.apiKey,
    verified: applicationState.verified,
    verifiedAt: applicationState.verification.verifiedAt,
    apiUsage: applicationState.apiUsage,
  };
}
