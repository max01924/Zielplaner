const MS_PER_DAY = 86_400_000;

function parseDateKey(dateKey) {
  if (typeof dateKey !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function parseHabitDate(value) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toDateKeyUtc(date) {
  return date.toISOString().slice(0, 10);
}

function addDaysUtc(date, amount) {
  return new Date(date.getTime() + amount * MS_PER_DAY);
}

function startOfIsoWeek(date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = utcDate.getUTCDay() || 7;
  return addDaysUtc(utcDate, 1 - weekday);
}

function completionCountForWeek(completedDates, weekStart) {
  return Array.from({ length: 7 }, (_, index) => toDateKeyUtc(addDaysUtc(weekStart, index))).filter(
    (dateKey) => completedDates.has(dateKey)
  ).length;
}

function normalizeTargetPerWeek(habit) {
  const rawTarget = habit?.target_per_week ?? habit?.targetPerWeek;
  const target = Number(rawTarget);
  if (!Number.isFinite(target)) {
    return 7;
  }
  return Math.max(1, Math.min(7, Math.trunc(target)));
}

export function calculateStreak(habit, referenceDate = new Date()) {
  const currentWeekTarget = normalizeTargetPerWeek(habit);
  const completions = Array.isArray(habit?.completions) ? habit.completions : [];
  const completedDates = new Set(completions.filter((dateKey) => parseDateKey(dateKey)));
  const currentWeekStart = startOfIsoWeek(parseHabitDate(referenceDate));
  const createdWeekStart = startOfIsoWeek(parseHabitDate(habit?.created_at ?? habit?.createdAt));
  const currentWeekCount = completionCountForWeek(completedDates, currentWeekStart);
  const currentWeekComplete = currentWeekCount >= currentWeekTarget;

  let streak = 0;
  let weekStart = addDaysUtc(currentWeekStart, -7);

  while (weekStart >= createdWeekStart) {
    const weekCount = completionCountForWeek(completedDates, weekStart);
    if (weekCount < currentWeekTarget) {
      break;
    }

    streak += 1;
    weekStart = addDaysUtc(weekStart, -7);
  }

  return {
    streak,
    currentWeekCount,
    currentWeekTarget,
    currentWeekComplete,
  };
}

/*
Beispielfaelle fuer ISO-Wochenlogik:

1. Heute ist Mittwoch, 2026-08-12. target_per_week = 2.
   completions: ["2026-08-03", "2026-08-05", "2026-08-10"]
   Die aktuelle Woche 2026-08-10 bis 2026-08-16 zaehlt nicht zum Streak.
   Die letzte vollstaendige Woche 2026-08-03 bis 2026-08-09 ist erfuellt.
   Ergebnis: { streak: 1, currentWeekCount: 1, currentWeekTarget: 2, currentWeekComplete: false }

2. Heute ist Montag, 2026-08-17. target_per_week = 3.
   completions: ["2026-08-04", "2026-08-05", "2026-08-07", "2026-08-11", "2026-08-12"]
   Rueckwaerts ab 2026-08-10: diese Woche hat nur 2 completions und bricht sofort.
   Ergebnis: streak = 0.

3. Habit created_at liegt in der aktuellen ISO-Woche, z.B. 2026-08-11.
   Rueckwaerts wuerde bei 2026-08-03 gestartet, diese Woche liegt aber vor created_at.
   Ergebnis: streak = 0, ohne vorherige Wochen als verfehlt zu werten.

4. Heute ist Sonntag, 2026-08-16.
   Die Woche 2026-08-10 bis 2026-08-16 ist noch die laufende Woche und zaehlt nicht zum Streak,
   auch wenn target_per_week bereits erreicht ist. Sie erscheint nur als currentWeekComplete.
*/
