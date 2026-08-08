import { Check, Pause } from "lucide-react";
import { addDays, daysInMonth, startOfIsoWeek, toDateKey } from "../utils/date.js";

const weekdayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "long" });
const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function dayEntry(date) {
  return {
    date,
    key: toDateKey(date),
    label: weekdayFormatter.format(date),
  };
}

function monthWeeks(monthDate) {
  const totalDays = daysInMonth(monthDate);
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => (
      dayEntry(new Date(monthDate.getFullYear(), monthDate.getMonth(), index + 1, 12))
    )),
  ];
  const trailingEmptyDays = (7 - (cells.length % 7)) % 7;
  cells.push(...Array.from({ length: trailingEmptyDays }, () => null));
  return Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) => (
    cells.slice(index * 7, index * 7 + 7)
  ));
}

function selectedWeek(anchorDate) {
  const start = startOfIsoWeek(anchorDate);
  return [Array.from({ length: 7 }, (_, index) => dayEntry(addDays(start, index)))];
}

export default function HabitHeatmap({
  monthDate,
  viewMode = "month",
  completions,
  status = "active",
  pauseStart = null,
  pauseEnd = null,
  onToggle,
}) {
  const completedDates = new Set(completions);

  function renderDay(day, key, compact = false) {
    const sizeClasses = compact
      ? "h-7 w-7 rounded-lg text-[9px]"
      : "mx-auto aspect-square w-full max-w-9 rounded-xl text-[10px] sm:h-12 sm:w-12 sm:max-w-none sm:text-xs";
    if (!day) {
      return <span key={key} aria-hidden="true" className={sizeClasses} />;
    }

    const isCompleted = completedDates.has(day.key);
    const isPaused = status === "paused"
      && pauseStart
      && pauseEnd
      && day.key >= pauseStart
      && day.key <= pauseEnd;
    return (
      <button
        key={day.key}
        type="button"
        onClick={() => onToggle(day.key)}
        disabled={isPaused}
        className={`grid place-items-center font-bold transition-colors ${sizeClasses} ${
          isPaused
            ? "cursor-not-allowed bg-canvas-deep/35 text-accent/70"
            : isCompleted
              ? "bg-accent text-accent-contrast"
              : "bg-canvas-deep text-muted hover:bg-surface-hover hover:text-ink"
        }`}
        aria-label={isPaused
          ? `${day.key} pausiert`
          : `${day.key} ${isCompleted ? "offen markieren" : "abhaken"}`}
        title={`${day.label}, ${day.key}${isPaused ? " - pausiert" : ""}`}
      >
        {isPaused
          ? <Pause className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
          : isCompleted
            ? <Check className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            : day.date.getDate()}
      </button>
    );
  }

  if (viewMode === "year") {
    const months = Array.from({ length: 12 }, (_, month) => (
      new Date(monthDate.getFullYear(), month, 1, 12)
    ));
    return (
      <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {months.map((date) => (
          <section key={date.getMonth()} className="render-lazy-month">
            <h4 className="mb-3 text-xs font-black uppercase text-ink">{monthFormatter.format(date)}</h4>
            <div className="grid grid-cols-7 justify-start gap-1">
              {weekdays.map((weekday) => (
                <span key={weekday} className="w-7 text-center text-[8px] font-bold uppercase text-subtle">
                  {weekday.slice(0, 1)}
                </span>
              ))}
              {monthWeeks(date).flat().map((day, index) => renderDay(day, `year-${date.getMonth()}-${index}`, true))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const weeks = viewMode === "week" ? selectedWeek(monthDate) : monthWeeks(monthDate);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 sm:grid-cols-[repeat(7,48px)] sm:justify-center sm:gap-3">
        {weekdays.map((weekday) => (
          <span key={weekday} className="text-center text-[10px] font-bold uppercase text-ink">
            {weekday}
          </span>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div
          key={weekIndex}
          className="grid grid-cols-7 gap-2 sm:grid-cols-[repeat(7,48px)] sm:justify-center sm:gap-3"
        >
          {week.map((day, dayIndex) => renderDay(day, `day-${weekIndex}-${dayIndex}`))}
        </div>
      ))}
    </div>
  );
}
