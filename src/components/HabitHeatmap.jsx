import { Check } from "lucide-react";
import { daysInMonth, toDateKey } from "../utils/date.js";

const weekdayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "short" });
const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function HabitHeatmap({ monthDate, completions, onToggle }) {
  const completedDates = new Set(completions);
  const totalDays = daysInMonth(monthDate);
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const monthCells = [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), index + 1);
      return {
        date,
        key: toDateKey(date),
        label: weekdayFormatter.format(date),
      };
    }),
  ];
  const trailingEmptyDays = (7 - (monthCells.length % 7)) % 7;
  const cells = [...monthCells, ...Array.from({ length: trailingEmptyDays }, () => null)];
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7)
  );

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-7 gap-1.5">
        {weekdays.map((weekday) => (
          <span
            key={weekday}
            className="text-center text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500"
          >
            {weekday}
          </span>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1.5">
          {week.map((day, dayIndex) => {
            if (!day) {
              return <span key={`empty-${dayIndex}`} aria-hidden="true" className="aspect-square min-h-8" />;
            }

            const isCompleted = completedDates.has(day.key);
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => onToggle(day.key)}
                className={`grid aspect-square min-h-8 place-items-center rounded-md border text-[11px] font-bold transition ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-sky-700 dark:hover:bg-sky-950/60"
                }`}
                aria-label={`${day.key} ${isCompleted ? "offen markieren" : "abhaken"}`}
                title={`${day.label}, ${day.key}`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : day.date.getDate()}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
