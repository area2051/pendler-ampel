import test from "node:test";
import assert from "node:assert/strict";

import { isWithinSchedule } from "../domain/schedule-calculator.js";

const localDate = (year, month, day, hour, minute) => new Date(year, month - 1, day, hour, minute);

test("isWithinSchedule includes the start and excludes the end", () => {
  const schedule = { activeWeekdays: [1], startTime: "15:00", endTime: "19:00" };

  assert.equal(isWithinSchedule(schedule, localDate(2026, 11, 16, 15, 0)), true);
  assert.equal(isWithinSchedule(schedule, localDate(2026, 11, 16, 18, 59)), true);
  assert.equal(isWithinSchedule(schedule, localDate(2026, 11, 16, 19, 0)), false);
});

test("isWithinSchedule assigns the after-midnight segment to the start weekday", () => {
  const schedule = { activeWeekdays: [1], startTime: "22:00", endTime: "01:00" };

  assert.equal(isWithinSchedule(schedule, localDate(2026, 11, 16, 22, 0)), true);
  assert.equal(isWithinSchedule(schedule, localDate(2026, 11, 17, 0, 59)), true);
  assert.equal(isWithinSchedule(schedule, localDate(2026, 11, 17, 1, 0)), false);
  assert.equal(isWithinSchedule(schedule, localDate(2026, 11, 17, 22, 30)), false);
});

test("isWithinSchedule rejects equal start and end times", () => {
  assert.equal(
    isWithinSchedule({ activeWeekdays: [1], startTime: "15:00", endTime: "15:00" }, localDate(2026, 11, 16, 15, 0)),
    false,
  );
});
