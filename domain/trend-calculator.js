export function calculateTrend(measurements) {
  const valid = measurements.filter((item) => Number.isFinite(item?.durationSeconds));
  if (valid.length < 3) {
    return "unknown";
  }

  const recent = valid.slice(-3);
  const difference = recent[2].durationSeconds - recent[0].durationSeconds;
  if (difference >= 180) {
    return "increasing";
  }
  if (difference <= -180) {
    return "decreasing";
  }
  return "stable";
}
