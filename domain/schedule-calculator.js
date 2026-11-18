function parseTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function isoWeekday(date) {
  return date.getDay() === 0 ? 7 : date.getDay();
}

function previousIsoWeekday(day) {
  return day === 1 ? 7 : day - 1;
}

export function isWithinSchedule(schedule, date = new Date()) {
  const start = parseTime(schedule?.startTime);
  const end = parseTime(schedule?.endTime);
  const activeDays = Array.isArray(schedule?.activeWeekdays) ? schedule.activeWeekdays : [];
  if (start === null || end === null || start === end) {
    return false;
  }

  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const today = isoWeekday(date);
  if (start < end) {
    return activeDays.includes(today) && nowMinutes >= start && nowMinutes < end;
  }

  if (nowMinutes >= start) {
    return activeDays.includes(today);
  }
  return nowMinutes < end && activeDays.includes(previousIsoWeekday(today));
}
