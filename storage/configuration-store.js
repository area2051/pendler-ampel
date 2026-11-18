import { DEFAULT_CONFIGURATION, STORAGE_KEYS } from "../shared/constants.js";
import {
  ConfigurationValidationError,
  normalizeConfiguration,
  validateConfiguration,
} from "../shared/validation.js";
import { coordinateStorageMutation } from "./storage-mutation-coordinator.js";

function storageOrDefault(storageArea) {
  return storageArea ?? chrome.storage.local;
}

function routeSignature(configuration, apiKey) {
  return JSON.stringify({
    apiKey,
    origin: configuration.origin,
    destination: configuration.destination,
    avoidTolls: configuration.avoidTolls,
    avoidHighways: configuration.avoidHighways,
    avoidFerries: configuration.avoidFerries,
  });
}

function measuredRouteSignature(configuration) {
  return JSON.stringify({
    origin: configuration.origin,
    destination: configuration.destination,
    avoidTolls: configuration.avoidTolls,
    avoidHighways: configuration.avoidHighways,
    avoidFerries: configuration.avoidFerries,
  });
}

export function loadConfigurationState(storageArea, mutationContext) {
  const storage = storageOrDefault(storageArea);
  return coordinateStorageMutation(mutationContext, async () => {
    const values = await storage.get([
      STORAGE_KEYS.configuration,
      STORAGE_KEYS.credentials,
      STORAGE_KEYS.verification,
    ]);
    const storedConfiguration = values.configuration ?? DEFAULT_CONFIGURATION;
    const configuration = normalizeConfiguration(storedConfiguration);
    const apiKey = String(values.credentials?.apiKey ?? storedConfiguration.apiKey ?? "");
    if (Object.hasOwn(storedConfiguration, "apiKey")) {
      await storage.set({
        [STORAGE_KEYS.configuration]: configuration,
        [STORAGE_KEYS.credentials]: { apiKey },
      });
    }
    return {
      configuration,
      credentials: { apiKey },
      verification: {
        verifiedRouteRevision: values.verification?.verifiedRouteRevision ?? null,
        verifiedRouteGeneration: values.verification?.verifiedRouteGeneration ?? "",
        verifiedAt: values.verification?.verifiedAt ?? null,
      },
    };
  });
}

export function saveConfigurationState(input, storageArea, mutationContext) {
  const storage = storageOrDefault(storageArea);
  return coordinateStorageMutation(mutationContext, async (activeContext) => {
    const current = await loadConfigurationState(storage, activeContext);
    const configuration = normalizeConfiguration(input);
    const apiKey = String(input.apiKey ?? current.credentials.apiKey ?? "").trim();
    const errors = validateConfiguration(configuration);
    if (errors.length > 0) {
      throw new ConfigurationValidationError(errors);
    }

    const routeChanged = routeSignature(current.configuration, current.credentials.apiKey)
      !== routeSignature(configuration, apiKey);
    const measuredRouteChanged = measuredRouteSignature(current.configuration)
      !== measuredRouteSignature(configuration);
    const identityChanged = routeChanged || !current.configuration.routeGeneration;
    configuration.routeRevision = routeChanged
      ? current.configuration.routeRevision + 1
      : current.configuration.routeRevision;
    configuration.routeGeneration = identityChanged
      ? crypto.randomUUID()
      : current.configuration.routeGeneration;
    const verification = identityChanged
      ? { verifiedRouteRevision: null, verifiedRouteGeneration: "", verifiedAt: null }
      : current.verification;

    const update = {
      [STORAGE_KEYS.configuration]: configuration,
      [STORAGE_KEYS.credentials]: { apiKey },
      [STORAGE_KEYS.verification]: verification,
    };
    if (measuredRouteChanged) {
      update[STORAGE_KEYS.measurements] = [];
      update[STORAGE_KEYS.lastMeasurement] = null;
    }
    await storage.set(update);
    return { configuration, credentials: { apiKey }, verification, routeChanged, measuredRouteChanged };
  });
}

export function markConfigurationVerified(configuration, verifiedAt, storageArea, mutationContext) {
  const storage = storageOrDefault(storageArea);
  return coordinateStorageMutation(mutationContext, async () => {
    const verification = {
      verifiedRouteRevision: configuration.routeRevision,
      verifiedRouteGeneration: configuration.routeGeneration,
      verifiedAt,
    };
    await storage.set({ [STORAGE_KEYS.verification]: verification });
    return verification;
  });
}

export function deleteApiKey(storageArea, mutationContext) {
  const storage = storageOrDefault(storageArea);
  return coordinateStorageMutation(mutationContext, async (activeContext) => {
    const current = await loadConfigurationState(storage, activeContext);
    current.configuration.routeRevision += 1;
    current.configuration.routeGeneration = crypto.randomUUID();
    const verification = { verifiedRouteRevision: null, verifiedRouteGeneration: "", verifiedAt: null };
    await storage.set({
      [STORAGE_KEYS.configuration]: current.configuration,
      [STORAGE_KEYS.credentials]: { apiKey: "" },
      [STORAGE_KEYS.verification]: verification,
    });
  });
}

export function clearAllLocalData(storageArea, mutationContext) {
  const storage = storageOrDefault(storageArea);
  return coordinateStorageMutation(mutationContext, () => storage.clear());
}

export function isConfigurationComplete(state) {
  return Boolean(
    state?.credentials?.apiKey?.trim()
    && state?.configuration?.origin?.trim()
    && state?.configuration?.destination?.trim(),
  );
}

export function isConfigurationVerified(state) {
  return isConfigurationComplete(state)
    && state.verification.verifiedRouteRevision === state.configuration.routeRevision
    && state.verification.verifiedRouteGeneration === state.configuration.routeGeneration;
}
