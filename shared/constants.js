export const ROUTES_ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";
export const ROUTES_FIELD_MASK = "routes.duration,routes.staticDuration,routes.distanceMeters";
export const STALE_AFTER_MS = 15 * 60 * 1000;
export const MAX_HISTORY_AGE_MS = 24 * 60 * 60 * 1000;
export const MAX_HISTORY_ENTRIES = 300;

export const DEFAULT_THRESHOLDS = Object.freeze({
  orangeDelaySeconds: 5 * 60,
  redDelaySeconds: 10 * 60,
  orangeDelayPercent: 15,
  redDelayPercent: 30,
  repeatIncreaseSeconds: 5 * 60,
  cooldownMinutes: 30,
});

export const DEFAULT_CONFIGURATION = Object.freeze({
  routeLabel: "Nach Hause",
  origin: "",
  destination: "",
  intervalMinutes: 5,
  activeWeekdays: [1, 2, 3, 4, 5],
  startTime: "15:00",
  endTime: "19:00",
  autoRefreshEnabled: true,
  notificationsEnabled: true,
  recoveryNotificationsEnabled: false,
  avoidTolls: false,
  avoidHighways: false,
  avoidFerries: false,
  thresholds: DEFAULT_THRESHOLDS,
  routeRevision: 0,
  routeGeneration: "",
});

export const STORAGE_KEYS = Object.freeze({
  configuration: "configuration",
  credentials: "credentials",
  verification: "verification",
  lastMeasurement: "lastMeasurement",
  measurements: "measurements",
  runtimeState: "runtimeState",
  notificationState: "notificationState",
  apiUsage: "apiUsage",
});

export const BADGE_COLORS = Object.freeze({
  green: "#188038",
  orange: "#E37400",
  red: "#D93025",
  gray: "#5F6368",
  setup: "#7E57C2",
});

export const ALARM_NAMES = Object.freeze({
  refresh: "commute-refresh",
  stale: "measurement-stale",
});
