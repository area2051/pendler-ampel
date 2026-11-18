const MESSAGES = Object.freeze({
  INCOMPLETE_CONFIGURATION: "Google-Routes-API-Key, Start- oder Zieladresse fehlt.",
  INVALID_ROUTE: "Die Routenkonfiguration konnte nicht verarbeitet werden. Bitte prüfe Start und Ziel.",
  AUTH_REJECTED: "Der API-Key wurde abgelehnt. Bitte prüfe, ob die Routes API aktiviert und für den Schlüssel erlaubt ist.",
  QUOTA_EXCEEDED: "Das Nutzungslimit der Google Routes API wurde erreicht.",
  NETWORK_ERROR: "Die Verkehrsdaten konnten nicht abgerufen werden. Der zuletzt erfolgreiche Wert wird weiterhin angezeigt.",
  TIMEOUT: "Die Anfrage an die Google Routes API hat zu lange gedauert.",
  NO_ROUTE: "Für Start und Ziel konnte keine Fahrroute gefunden werden.",
  INVALID_RESPONSE: "Die Google Routes API hat keine gültigen Routendaten geliefert.",
  REFRESH_IN_PROGRESS: "Eine Aktualisierung läuft bereits.",
  REFRESH_INVALIDATED: "Die Einstellungen wurden während der Aktualisierung geändert. Bitte versuche es erneut.",
  NOT_VERIFIED: "Die Konfiguration muss zuerst erfolgreich getestet werden.",
  UNKNOWN: "Ein unerwarteter Fehler ist aufgetreten.",
});

export class ApiError extends Error {
  constructor(code, options = {}) {
    super(MESSAGES[code] ?? "Die Verkehrsdaten konnten nicht verarbeitet werden.", options);
    this.name = "ApiError";
    this.code = code;
  }
}

export function publicError(error) {
  if (error instanceof ApiError && Object.hasOwn(MESSAGES, error.code)) {
    return { code: error.code, message: error.message };
  }
  if (error?.name === "ConfigurationValidationError") {
    return { code: "VALIDATION_ERROR", message: error.message };
  }
  return { code: "UNKNOWN", message: MESSAGES.UNKNOWN };
}
