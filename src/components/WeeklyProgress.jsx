import { toDateKey } from "../utils/date.js";
import { clampPercent } from "../utils/progress.js";

function startOfWeek(date) {
  const start = new Date(date);
  const weekday = start.getDay() || 7;
  start.setDate(start.getDate() - weekday + 1);
  return start;
}

function weekDates(anchorDate) {
  const start = startOfWeek(anchorDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toDateKey(date);
  });
}

export default function WeeklyProgress({ completions, targetPerWeek, streakInfo }) {
  const completedDates = new Set(completions);
  const doneThisWeek =
    streakInfo?.currentWeekCount ?? weekDates(new Date()).filter((date) => completedDates.has(date)).length;
  const target = streakInfo?.currentWeekTarget ?? Math.max(1, Math.min(7, Number(targetPerWeek) || 7));
  const percent = clampPercent((doneThisWeek / target) * 100);
  const reached = streakInfo?.currentWeekComplete ?? doneThisWeek >= target;
  const remaining = Math.max(0, target - doneThisWeek);

  return (
    <div className={`rounded-lg border p-3 ${reached ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30" : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/25"}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {doneThisWeek} von {target} diese Woche
          </p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {reached ? "Wochenziel erreicht" : `Noch ${remaining} für den Streak`}
          </p>
        </div>
        <span className={`text-xs font-bold ${reached ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
          {percent}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/80 dark:bg-slate-900">
        <div
          className={`h-full rounded-full transition-all duration-300 ${reached ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
