const timeFormatter = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
const distanceFormatter = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatClock(iso) {
  return iso ? timeFormatter.format(new Date(iso)) : "–";
}

export function formatDistance(distanceMeters) {
  return `${distanceFormatter.format(distanceMeters / 1_000)} km`;
}

export function formatSigned(value, suffix) {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${Math.abs(rounded)}${suffix}`;
}

export function formatDataAge(observedAt, now = new Date()) {
  if (!observedAt) return "Keine Daten";
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(observedAt)) / 60_000));
  if (minutes === 0) return "gerade eben";
  return `vor ${minutes} Min.`;
}
