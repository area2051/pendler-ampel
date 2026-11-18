import { STORAGE_KEYS } from "../shared/constants.js";
import { coordinateStorageMutation } from "./storage-mutation-coordinator.js";

export async function loadRuntimeState(storageArea = chrome.storage.local) {
  const values = await storageArea.get(STORAGE_KEYS.runtimeState);
  return {
    lastFetchAttemptAt: null,
    lastSuccessfulFetchAt: null,
    lastError: null,
    ...(values.runtimeState ?? {}),
  };
}

export function saveRuntimeState(runtimeState, storageArea = chrome.storage.local, mutationContext) {
  return coordinateStorageMutation(
    mutationContext,
    () => storageArea.set({ [STORAGE_KEYS.runtimeState]: runtimeState }),
  );
}
