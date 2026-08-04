import { clampPercent } from "./progress.js";
import { dayOfYear, daysInMonth, isLeapYear, startOfIsoWeek, toDateKey, toMonthKey } from "./date.js";

function hoursToday(now) {
  return now.getHours() + now.getMinutes() / 60;
}

export function isCurrentPeriod(period, selectedDate, now = new Date()) {
  if (period === "day") return toDateKey(selectedDate) === toDateKey(now);
  if (period === "week") {
    return toDateKey(startOfIsoWeek(selectedDate)) === toDateKey(startOfIsoWeek(now));
  }
  if (period === "month") return toMonthKey(selectedDate) === toMonthKey(now);
  return selectedDate.getFullYear() === now.getFullYear();
}

export function periodTimeProgress(period, selectedDate, now = new Date()) {
  let elapsed = 0;
  let total = 24;
  let unit = "Stunden";
  let comparison = 0;

  if (period === "day") {
    comparison = toDateKey(selectedDate).localeCompare(toDateKey(now));
    elapsed = comparison < 0 ? 24 : comparison > 0 ? 0 : hoursToday(now);
  } else if (period === "week") {
    const selectedKey = toDateKey(startOfIsoWeek(selectedDate));
    const currentKey = toDateKey(startOfIsoWeek(now));
    comparison = selectedKey.localeCompare(currentKey);
    total = 7 * 24;
    const weekdayIndex = (now.getDay() + 6) % 7;
    elapsed = comparison < 0 ? total : comparison > 0 ? 0 : weekdayIndex * 24 + hoursToday(now);
  } else if (period === "month") {
    comparison = toMonthKey(selectedDate).localeCompare(toMonthKey(now));
    total = daysInMonth(selectedDate) * 24;
    elapsed = comparison < 0
      ? total
      : comparison > 0
        ? 0
        : (now.getDate() - 1) * 24 + hoursToday(now);
  } else {
    comparison = Math.sign(selectedDate.getFullYear() - now.getFullYear());
    total = isLeapYear(selectedDate.getFullYear()) ? 366 : 365;
    unit = "Tage";
    elapsed = comparison < 0 ? total : comparison > 0 ? 0 : dayOfYear(now);
  }

  return {
    elapsed,
    total,
    unit,
    percent: clampPercent((elapsed / total) * 100),
  };
}
