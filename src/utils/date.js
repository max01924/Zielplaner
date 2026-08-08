const weekdayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "long" });
const fullDateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const monthFormatter = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  year: "numeric",
});
const monthNameFormatter = new Intl.DateTimeFormat("de-DE", { month: "long" });
const shortDayFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
});
const shortDayYearFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function startOfIsoWeek(date) {
  const start = new Date(date);
  start.setHours(12, 0, 0, 0);
  const weekday = start.getDay() || 7;
  start.setDate(start.getDate() - weekday + 1);
  return start;
}

export function isoWeekKeyFromDateKey(dateKey) {
  const date = dateFromKey(dateKey);
  if (Number.isNaN(date.getTime())) return null;
  return toDateKey(startOfIsoWeek(date));
}

export function addWeeks(date, amount) {
  return addDays(startOfIsoWeek(date), amount * 7);
}

export function formatWeekRange(date) {
  const start = startOfIsoWeek(date);
  const end = addDays(start, 6);
  if (start.getFullYear() === end.getFullYear()) {
    return `${shortDayFormatter.format(start)} - ${shortDayYearFormatter.format(end)}`;
  }
  return `${shortDayYearFormatter.format(start)} - ${shortDayYearFormatter.format(end)}`;
}

export function isoWeekNumber(date) {
  const target = startOfIsoWeek(date);
  target.setDate(target.getDate() + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4, 12);
  const firstWeekStart = startOfIsoWeek(firstThursday);
  return 1 + Math.round((target - firstWeekStart) / 604_800_000);
}

export function toIsoWeekInputValue(dateKey) {
  if (!dateKey) return "";
  const date = dateFromKey(dateKey);
  if (Number.isNaN(date.getTime())) return "";
  const thursday = startOfIsoWeek(date);
  thursday.setDate(thursday.getDate() + 3);
  return `${thursday.getFullYear()}-W${String(isoWeekNumber(date)).padStart(2, "0")}`;
}

export function dateKeyFromIsoWeek(value) {
  if (!value) return null;
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const firstWeekStart = startOfIsoWeek(new Date(year, 0, 4, 12));
  const weekStart = addWeeks(firstWeekStart, week - 1);
  return toIsoWeekInputValue(toDateKey(weekStart)) === value ? toDateKey(weekStart) : null;
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function addYears(date, amount) {
  return new Date(date.getFullYear() + amount, 0, 1, 12);
}

export function dateFromKey(dateKey) {
  const [year, month = 1, day = 1] = String(dateKey).split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function toMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatWeekday(date) {
  return weekdayFormatter.format(date);
}

export function formatFullDate(date) {
  return fullDateFormatter.format(date);
}

export function formatMonth(date) {
  return monthFormatter.format(date);
}

export function formatMonthName(date) {
  return monthNameFormatter.format(date);
}

export function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  return Math.floor(diff / 86_400_000);
}

export function isLeapYear(year) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}
