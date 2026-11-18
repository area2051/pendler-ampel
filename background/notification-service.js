function cooldownElapsed(state, configuration, now) {
  if (!state.lastWarningAt) return true;
  return now.getTime() - Date.parse(state.lastWarningAt) >= configuration.thresholds.cooldownMinutes * 60_000;
}

function warningContent(measurement) {
  const current = Math.round(measurement.durationSeconds / 60);
  const normal = Math.round(measurement.baselineSeconds / 60);
  return {
    kind: "warning",
    title: "Starker Verkehr auf deinem Heimweg",
    message: `Aktuell ${current} statt normalerweise ${normal} Minuten. Die Verkehrslage verschlechtert sich.`,
  };
}

function recoveryContent(measurement) {
  return {
    kind: "recovery",
    title: "Verkehrslage verbessert",
    message: `Die Fahrzeit ist auf ${Math.round(measurement.durationSeconds / 60)} Minuten gesunken.`,
  };
}

export function decideNotification({ measurement, configuration, state, now = new Date(), eligible }) {
  if (!eligible || !configuration.notificationsEnabled) {
    return { notification: null, state };
  }

  const nextState = { ...state };
  const wasRed = state.lastObservedStatus === "red";
  nextState.lastObservedStatus = measurement.status;

  if (measurement.status === "red") {
    if (!wasRed) {
      nextState.redEpisodeWarned = false;
      nextState.lastWarnedDurationSeconds = null;
    }
    const mayNotify = cooldownElapsed(state, configuration, now);
    const firstWarning = !nextState.redEpisodeWarned;
    const worsenedEnough = nextState.redEpisodeWarned
      && measurement.durationSeconds >= nextState.lastWarnedDurationSeconds + configuration.thresholds.repeatIncreaseSeconds;
    if (mayNotify && (firstWarning || worsenedEnough)) {
      nextState.redEpisodeWarned = true;
      nextState.lastWarningAt = now.toISOString();
      nextState.lastWarnedDurationSeconds = measurement.durationSeconds;
      return { notification: warningContent(measurement), state: nextState };
    }
    return { notification: null, state: nextState };
  }

  nextState.redEpisodeWarned = false;
  nextState.lastWarnedDurationSeconds = null;
  if (wasRed && configuration.recoveryNotificationsEnabled && cooldownElapsed(state, configuration, now)) {
    nextState.lastWarningAt = now.toISOString();
    return { notification: recoveryContent(measurement), state: nextState };
  }
  return { notification: null, state: nextState };
}

export async function showNotification(notification, notificationsApi = chrome.notifications) {
  if (!notification) return null;
  return notificationsApi.create(`pendler-ampel-${notification.kind}`, {
    type: "basic",
    iconUrl: "assets/icon-128.png",
    title: notification.title,
    message: notification.message,
  });
}
