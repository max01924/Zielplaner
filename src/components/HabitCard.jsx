import { Flame, Pencil, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { calculateStreak } from "../utils/streaks.js";
import HabitHeatmap from "./HabitHeatmap.jsx";
import WeeklyProgress from "./WeeklyProgress.jsx";

export default function HabitCard({ habit, monthDate, onUpdate, onDelete, onToggle }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(habit.name);
  const [draftTarget, setDraftTarget] = useState(habit.targetPerWeek);
  const streakInfo = calculateStreak(habit);

  function save() {
    const name = draftName.trim();
    if (!name) {
      return;
    }
    onUpdate(habit.id, { name, targetPerWeek: Number(draftTarget) });
    setIsEditing(false);
  }

  function cancel() {
    setDraftName(habit.name);
    setDraftTarget(habit.targetPerWeek);
    setIsEditing(false);
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") save();
                  if (event.key === "Escape") cancel();
                }}
                className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                autoFocus
              />
              <select
                value={draftTarget}
                onChange={(event) => setDraftTarget(Number(event.target.value))}
                className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                  <option key={value} value={value}>
                    {value}x pro Woche
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <h3 className="truncate text-lg font-black text-slate-950 dark:text-white">{habit.name}</h3>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Ziel: {habit.targetPerWeek}x pro Woche
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={save}
                className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Habit speichern"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={cancel}
                className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Bearbeitung abbrechen"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Habit bearbeiten"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(habit.id)}
            className="grid h-9 w-9 place-items-center rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            aria-label="Habit löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/25 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-orange-500 text-white shadow-sm">
              <Flame className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-orange-700 dark:text-orange-300">
                Streak
              </p>
              <p className="text-xl font-black text-slate-950 dark:text-white">
                {streakInfo.streak} {streakInfo.streak === 1 ? "Woche" : "Wochen"} Streak
              </p>
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Letzte vollständige Wochen
          </p>
        </div>
        <WeeklyProgress
          completions={habit.completions}
          targetPerWeek={habit.targetPerWeek}
          streakInfo={streakInfo}
        />
        <HabitHeatmap
          monthDate={monthDate}
          completions={habit.completions}
          onToggle={(date) => onToggle(habit.id, date)}
        />
      </div>
    </article>
  );
}
