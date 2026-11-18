import { publicError } from "../api/api-error.js";
import { isWithinSchedule } from "../domain/schedule-calculator.js";
import { loadApplicationState, buildOptionsState } from "../shared/app-state.js";
import { ALARM_NAMES, STORAGE_KEYS } from "../shared/constants.js";
import { errorResponse, MESSAGE_TYPES, successResponse } from "../shared/messages.js";
import { buildPublicState } from "../shared/view-model.js";
import {
  clearAllLocalData,
  deleteApiKey,
  loadConfigurationState,
  saveConfigurationState,
} from "../storage/configuration-store.js";
import { reclassifyMeasurements } from "../storage/measurement-store.js";
import {
  loadNotificationState,
  resetNotificationState,
  saveNotificationState,
} from "../storage/notification-store.js";
import { runStorageMutation } from "../storage/storage-mutation-coordinator.js";
import { updateBadge } from "./badge-service.js";
import { decideNotification, showNotification } from "./notification-service.js";
import { createRefreshService } from "./refresh-service.js";
import {
  shouldAutomaticallyRefresh,
  shouldRefreshOnStartup,
  synchronizeAlarms,
} from "./scheduler.js";

const refreshService = createRefreshService();

async function refreshPresentation(mutationContext) {
  const state = await loadApplicationState(undefined, mutationContext);
  await updateBadge(state);
  return state;
}

async function processNotification(result, now = new Date(), mutationContext) {
  if (result.source === "test" || !isWithinSchedule(result.configuration, now)) return;
  const state = await loadNotificationState();
  const decision = decideNotification({
    measurement: result.measurement,
    configuration: result.configuration,
    state,
    now,
    eligible: true,
  });
  await saveNotificationState(decision.state, undefined, mutationContext);
  await showNotification(decision.notification);
}

async function performRefresh(request) {
  const result = await refreshService.refresh(request);
  return refreshService.runIfCurrent(result, async (mutationContext) => {
    if (result.source === "test") {
      await reclassifyMeasurements(result.configuration.thresholds, undefined, mutationContext);
      await resetNotificationState(undefined, mutationContext);
    } else {
      await processNotification(result, new Date(), mutationContext);
    }
    const state = await refreshPresentation(mutationContext);
    await synchronizeAlarms(state);
    return buildPublicState(state);
  });
}

async function saveSettings(input) {
  await runStorageMutation(async (mutationContext) => {
    const before = await loadConfigurationState(undefined, mutationContext);
    const saved = await saveConfigurationState(input, undefined, mutationContext);
    refreshService.invalidate();
    const thresholdsChanged = JSON.stringify(before.configuration.thresholds)
      !== JSON.stringify(saved.configuration.thresholds);
    if (thresholdsChanged) {
      await reclassifyMeasurements(saved.configuration.thresholds, undefined, mutationContext);
    }
    if (thresholdsChanged || saved.routeChanged || (!before.configuration.notificationsEnabled && saved.configuration.notificationsEnabled)) {
      await resetNotificationState(undefined, mutationContext);
    }
  });
  const state = await refreshPresentation();
  await synchronizeAlarms(state);
  return buildOptionsState(state);
}

async function handleMessage(message) {
  switch (message?.type) {
    case MESSAGE_TYPES.getPublicState:
      return buildPublicState(await loadApplicationState());
    case MESSAGE_TYPES.getOptionsState:
      return buildOptionsState(await loadApplicationState());
    case MESSAGE_TYPES.saveConfiguration:
      return saveSettings(message.configuration);
    case MESSAGE_TYPES.testConfiguration:
      return performRefresh({ source: "test", candidateConfiguration: message.configuration });
    case MESSAGE_TYPES.refreshNow:
      return performRefresh({ source: "manual" });
    case MESSAGE_TYPES.deleteApiKey: {
      await runStorageMutation(async (mutationContext) => {
        await deleteApiKey(undefined, mutationContext);
        refreshService.invalidate();
        await resetNotificationState(undefined, mutationContext);
      });
      const state = await refreshPresentation();
      await synchronizeAlarms(state);
      return buildOptionsState(state);
    }
    case MESSAGE_TYPES.clearLocalData: {
      await runStorageMutation(async (mutationContext) => {
        refreshService.invalidate();
        await clearAllLocalData(undefined, mutationContext);
      });
      await Promise.all([chrome.alarms.clear(ALARM_NAMES.refresh), chrome.alarms.clear(ALARM_NAMES.stale)]);
      return buildOptionsState(await refreshPresentation());
    }
    default:
      throw new TypeError("Unbekannte interne Nachricht.");
  }
}

async function initialize({ refreshIfStale = false } = {}) {
  await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
  const state = await refreshPresentation();
  await synchronizeAlarms(state);
  if (refreshIfStale && shouldRefreshOnStartup(state)) {
    try {
      await performRefresh({ source: "startup" });
    } catch {
      await refreshPresentation();
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void initialize();
});

chrome.runtime.onStartup.addListener(() => {
  void initialize({ refreshIfStale: true });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  void (async () => {
    if (alarm.name === ALARM_NAMES.refresh) {
      const state = await loadApplicationState();
      if (shouldAutomaticallyRefresh(state)) {
        try {
          await performRefresh({ source: "alarm" });
        } catch {
          await refreshPresentation();
        }
      }
    } else if (alarm.name === ALARM_NAMES.stale) {
      await refreshPresentation();
    }
  })();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((data) => sendResponse(successResponse(data)))
    .catch((error) => sendResponse(errorResponse(publicError(error))));
  return true;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes[STORAGE_KEYS.lastMeasurement] || changes[STORAGE_KEYS.verification] || changes[STORAGE_KEYS.configuration]) {
    void refreshPresentation();
  }
});

void initialize();
