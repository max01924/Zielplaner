const MS_PER_DAY = 86_400_000;

function parseDateKey(dateKey) {
  if (typeof dateKey !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3])
    ? date
    : null;
}

function parseHabitDate(value) {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) return new Date();
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function toDateKeyUtc(date) {
  return date.toISOString().slice(0, 10);
}

function addDaysUtc(date, amount) {
  return new Date(date.getTime() + amount * MS_PER_DAY);
}

function addMonthsUtc(date, amount) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function startOfIsoWeek(date) {
  const weekday = date.getUTCDay() || 7;
  return addDaysUtc(date, 1 - weekday);
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function daysInUtcMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function completionCount(completedDates, periodStart, numberOfDays) {
  let count = 0;
  for (let index = 0; index < numberOfDays; index += 1) {
    if (completedDates.has(toDateKeyUtc(addDaysUtc(periodStart, index)))) count += 1;
  }
  return count;
}

function frequencyPeriod(habit) {
  const value = habit?.frequency_period ?? habit?.frequencyPeriod;
  return value === "day" || value === "month" ? value : "week";
}

function configuredTarget(habit, period) {
  if (period === "day") return 1;
  const raw = habit?.target_count ?? habit?.targetCount
    ?? habit?.target_per_week ?? habit?.targetPerWeek;
  const number = Number(raw);
  const maximum = period === "month" ? 31 : 7;
  if (!Number.isFinite(number)) return period === "month" ? 1 : 7;
  return Math.max(1, Math.min(maximum, Math.trunc(number)));
}

function pauseRange(habit) {
  if ((habit?.status ?? "active") !== "paused") return null;
  const start = parseDateKey(habit?.pause_start ?? habit?.pauseStart);
  const end = parseDateKey(habit?.pause_end ?? habit?.pauseEnd);
  return start && end && start <= end ? { start, end } : null;
}

function isPausedDate(date, pause) {
  return Boolean(pause && date >= pause.start && date <= pause.end);
}

export function calculateStreak(habit, referenceDate = new Date()) {
  const period = frequencyPeriod(habit);
  const target = configuredTarget(habit, period);
  const completions = Array.isArray(habit?.completions) ? habit.completions : [];
  const completedDates = new Set(completions.filter((dateKey) => parseDateKey(dateKey)));
  const reference = parseHabitDate(referenceDate);
  const created = parseHabitDate(habit?.created_at ?? habit?.createdAt);
  const pause = pauseRange(habit);

  if (period === "day") {
    const currentPeriodCount = completedDates.has(toDateKeyUtc(reference)) ? 1 : 0;
    const currentPeriodPaused = isPausedDate(reference, pause);
    let streak = 0;
    let cursor = addDaysUtc(reference, -1);
    while (cursor >= created) {
      if (isPausedDate(cursor, pause)) {
        cursor = addDaysUtc(cursor, -1);
        continue;
      }
      if (!completedDates.has(toDateKeyUtc(cursor))) break;
      streak += 1;
      cursor = addDaysUtc(cursor, -1);
    }
    return {
      streak,
      frequencyPeriod: period,
      currentPeriodCount,
      currentPeriodTarget: 1,
      currentPeriodComplete: currentPeriodCount === 1,
      currentPeriodPaused,
    };
  }

  if (period === "month") {
    const currentStart = startOfMonth(reference);
    const createdStart = startOfMonth(created);
    const currentPeriodTarget = Math.min(target, daysInUtcMonth(currentStart));
    const currentPeriodCount = completionCount(
      completedDates,
      currentStart,
      daysInUtcMonth(currentStart)
    );
    let streak = 0;
    let cursor = addMonthsUtc(currentStart, -1);
    while (cursor >= createdStart) {
      const periodTarget = Math.min(target, daysInUtcMonth(cursor));
      if (completionCount(completedDates, cursor, daysInUtcMonth(cursor)) < periodTarget) break;
      streak += 1;
      cursor = addMonthsUtc(cursor, -1);
    }
    return {
      streak,
      frequencyPeriod: period,
      currentPeriodCount,
      currentPeriodTarget,
      currentPeriodComplete: currentPeriodCount >= currentPeriodTarget,
      currentPeriodPaused: false,
    };
  }

  const currentStart = startOfIsoWeek(reference);
  const createdStart = startOfIsoWeek(created);
  const currentPeriodCount = completionCount(completedDates, currentStart, 7);
  let streak = 0;
  let cursor = addDaysUtc(currentStart, -7);
  while (cursor >= createdStart) {
    if (completionCount(completedDates, cursor, 7) < target) break;
    streak += 1;
    cursor = addDaysUtc(cursor, -7);
  }
  return {
    streak,
    frequencyPeriod: period,
    currentPeriodCount,
    currentPeriodTarget: target,
    currentPeriodComplete: currentPeriodCount >= target,
    currentPeriodPaused: false,
    currentWeekCount: currentPeriodCount,
    currentWeekTarget: target,
    currentWeekComplete: currentPeriodCount >= target,
  };
}
