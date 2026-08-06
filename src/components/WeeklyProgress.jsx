import { clampPercent } from "../utils/progress.js";

const periodCopy = {
  day: {
    counter: "heute",
    complete: "Tagesziel erreicht",
    remaining: "für das Tagesziel",
  },
  week: {
    counter: "diese Woche",
    complete: "Wochenziel erreicht",
    remaining: "für den Wochen-Streak",
  },
  month: {
    counter: "diesen Monat",
    complete: "Monatspriorität erreicht",
    remaining: "für den Monats-Streak",
  },
};

export default function WeeklyProgress({ streakInfo }) {
  const period = streakInfo?.frequencyPeriod ?? "week";
  const copy = periodCopy[period];
  const done = streakInfo?.currentPeriodCount ?? streakInfo?.currentWeekCount ?? 0;
  const target = streakInfo?.currentPeriodTarget ?? streakInfo?.currentWeekTarget ?? 1;
  const reached = streakInfo?.currentPeriodComplete ?? streakInfo?.currentWeekComplete ?? false;
  const paused = streakInfo?.currentPeriodPaused ?? false;
  const percent = paused ? 0 : clampPercent((done / target) * 100);
  const remaining = Math.max(0, target - done);

  return (
    <div className="py-1">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink">
            {paused ? "Heute pausiert" : `${done} von ${target} ${copy.counter}`}
          </p>
          <p className="mt-1 text-xs font-semibold text-ink">
            {paused ? "Kein Tagesziel fällig" : reached ? copy.complete : `Noch ${remaining} ${copy.remaining}`}
          </p>
        </div>
        <span className="text-xs font-black text-ink">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-canvas-deep/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
