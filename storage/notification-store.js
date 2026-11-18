import { STORAGE_KEYS } from "../shared/constants.js";
import { coordinateStorageMutation } from "./storage-mutation-coordinator.js";

export const EMPTY_NOTIFICATION_STATE = Object.freeze({
  lastObservedStatus: null,
  redEpisodeWarned: false,
  lastWarningAt: null,
  lastWarnedDurationSeconds: null,
});

export async function loadNotificationState(storageArea = chrome.storage.local) {
  const values = await storageArea.get(STORAGE_KEYS.notificationState);
  return { ...EMPTY_NOTIFICATION_STATE, ...(values.notificationState ?? {}) };
}

export function saveNotificationState(state, storageArea = chrome.storage.local, mutationContext) {
  return coordinateStorageMutation(
    mutationContext,
    () => storageArea.set({ [STORAGE_KEYS.notificationState]: state }),
  );
}

export function resetNotificationState(storageArea = chrome.storage.local, mutationContext) {
  return saveNotificationState({ ...EMPTY_NOTIFICATION_STATE }, storageArea, mutationContext);
}
