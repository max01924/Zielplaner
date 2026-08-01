import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { addMonths, formatMonth } from "../utils/date.js";
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

  function createHabit(habit) {
    onCreateHabit(habit);
    setIsAdding(false);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(monthDate, -1))}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sm:hidden">Vorheriger Monat</span>
        </button>

        <div className="min-w-0 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Habits</p>
          <h2 className="text-2xl font-black capitalize text-slate-950 dark:text-white">{formatMonth(monthDate)}</h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onMonthChange(new Date())}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Heute
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(monthDate, 1))}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Nächster Monat"
          >
            <span className="sm:hidden">Nächster Monat</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isAdding ? (
        <HabitForm onCreate={createHabit} onCancel={() => setIsAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
        >
          <Plus className="h-4 w-4" />
          Hinzufügen
        </button>
      )}

      <div className="rounded-lg border border-teal-100 bg-teal-50/70 p-4 shadow-sm dark:border-teal-900/70 dark:bg-teal-950/25">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950 dark:text-teal-50">Habit-Tracker</h2>
          <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
            {habits.length} Habits
          </span>
        </div>

        {habits.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                monthDate={monthDate}
                onUpdate={onUpdateHabit}
                onDelete={onDeleteHabit}
                onToggle={onToggleHabit}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-teal-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-teal-800 dark:bg-slate-950 dark:text-slate-400">
            Noch keine Habits angelegt.
          </div>
        )}
      </div>
    </section>
  );
}
