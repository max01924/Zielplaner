import { Calendar, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { addMonths, addWeeks, addYears, formatMonth, formatWeekRange } from "../utils/date.js";
import DecorativeAccent from "./DecorativeAccent.jsx";
import HabitCard from "./HabitCard.jsx";
import HabitForm from "./HabitForm.jsx";

export default function HabitsView({
  habits,
  monthDate,
  onMonthChange,
  onCreateHabit,
  onUpdateHabit,
  onDeleteHabit,
  onToggleHabit,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [viewMode, setViewMode] = useState("month");
  const isWeekView = viewMode === "week";
  const isYearView = viewMode === "year";

  function movePeriod(amount) {
    if (isWeekView) {
      onMonthChange(addWeeks(monthDate, amount));
    } else if (isYearView) {
      onMonthChange(addYears(monthDate, amount));
    } else {
      onMonthChange(addMonths(monthDate, amount));
    }
  }

  function createHabit(habit) {
    onCreateHabit(habit);
    setIsAdding(false);
  }

  return (
    <section className="space-y-9">
      <div className="bg-depth-panel rounded-panel p-5 shadow-panel sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase text-subtle">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Habits
            </p>
            <h2 className="text-3xl font-black uppercase leading-none text-ink sm:text-4xl">
              {isWeekView
                ? formatWeekRange(monthDate)
                : isYearView
                  ? monthDate.getFullYear()
                  : formatMonth(monthDate)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-depth-inset grid grid-cols-3 gap-1 rounded-control p-1 shadow-inset" aria-label="Habit-Zeitraum">
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`inline-flex min-h-9 items-center gap-2 rounded-[18px] px-3 text-[10px] font-black uppercase transition ${
                  isWeekView ? "bg-accent text-accent-contrast" : "text-muted hover:text-ink"
                }`}
                aria-pressed={isWeekView}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Woche
              </button>
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`inline-flex min-h-9 items-center gap-2 rounded-[18px] px-3 text-[10px] font-black uppercase transition ${
                  viewMode === "month" ? "bg-accent text-accent-contrast" : "text-muted hover:text-ink"
                }`}
                aria-pressed={viewMode === "month"}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                Monat
              </button>
              <button
                type="button"
                onClick={() => setViewMode("year")}
                className={`inline-flex min-h-9 items-center gap-2 rounded-[18px] px-3 text-[10px] font-black uppercase transition ${
                  isYearView ? "bg-accent text-accent-contrast" : "text-muted hover:text-ink"
                }`}
                aria-pressed={isYearView}
              >
                <Calendar className="h-3.5 w-3.5" />
                Jahr
              </button>
            </div>
            <button
              type="button"
              onClick={() => movePeriod(-1)}
              className="bg-depth-control grid h-11 w-11 place-items-center rounded-control text-muted shadow-inset transition hover:brightness-125 hover:text-ink"
              aria-label={isWeekView ? "Vorherige Woche" : isYearView ? "Vorheriges Jahr" : "Vorheriger Monat"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onMonthChange(new Date())}
              className="min-h-11 rounded-control bg-accent px-4 text-xs font-black uppercase text-accent-contrast shadow-inset transition hover:brightness-110"
            >
              Heute
            </button>
            <button
              type="button"
              onClick={() => movePeriod(1)}
              className="bg-depth-control grid h-11 w-11 place-items-center rounded-control text-muted shadow-inset transition hover:brightness-125 hover:text-ink"
              aria-label={isWeekView ? "Nächste Woche" : isYearView ? "Nächstes Jahr" : "Nächster Monat"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isAdding ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-black text-accent-contrast shadow-inset transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Habit hinzufügen
          </button>
        ) : null}
      </div>

      {isAdding ? (
        <HabitForm
          monthDate={monthDate}
          onCreate={createHabit}
          onCancel={() => setIsAdding(false)}
        />
      ) : null}

      <div>
        <div className="relative mb-5 flex items-end justify-between gap-4 pb-4">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase text-subtle">Rhythmus</p>
            <h2 className="text-2xl font-black uppercase text-ink">Habit-Tracker</h2>
          </div>
          <DecorativeAccent
            shape="diamond"
            size={14}
            className="right-[92px] top-2 hidden sm:block"
          />
          <span className="text-xs font-bold uppercase text-muted">
            {habits.length} Habits
          </span>
        </div>

        {habits.length ? (
          <div className={`grid grid-cols-[minmax(0,1fr)] gap-5 ${isYearView ? "lg:grid-cols-1" : "lg:grid-cols-2"}`}>
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                monthDate={monthDate}
                viewMode={viewMode}
                onUpdate={onUpdateHabit}
                onDelete={onDeleteHabit}
                onToggle={onToggleHabit}
              />
            ))}
          </div>
        ) : (
          <div className="bg-depth-panel relative overflow-hidden rounded-panel p-10 text-center text-sm text-muted shadow-card">
            <DecorativeAccent shape="star" size={18} className="right-6 top-5" />
            Noch keine Habits angelegt.
          </div>
        )}
      </div>
    </section>
  );
}
