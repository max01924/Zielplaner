import { Flame, Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { daysInMonth } from "../utils/date.js";
import { calculateStreak } from "../utils/streaks.js";
import HabitHeatmap from "./HabitHeatmap.jsx";
import HabitStatusControl from "./HabitStatusControl.jsx";
import WeeklyProgress from "./WeeklyProgress.jsx";

export default function HabitCard({ habit, monthDate, viewMode, onUpdate, onDelete, onToggle }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(habit.name);
  const [draftFrequency, setDraftFrequency] = useState(habit.frequencyPeriod ?? "week");
  const [draftTarget, setDraftTarget] = useState(habit.targetCount ?? habit.targetPerWeek);
  const maximumMonthlyTarget = daysInMonth(monthDate);
  const streakInfo = calculateStreak(habit);
  const hasActiveStreak = streakInfo.streak > 0;
  const streakUnit = streakInfo.frequencyPeriod === "day"
    ? ["Tag", "Tage"]
    : streakInfo.frequencyPeriod === "month"
      ? ["Monat", "Monate"]
      : ["Woche", "Wochen"];

  useEffect(() => {
    if (draftFrequency === "month") {
      setDraftTarget((current) => Math.min(maximumMonthlyTarget, Math.max(1, Number(current) || 1)));
    }
  }, [draftFrequency, maximumMonthlyTarget]);

  function changeFrequency(nextPeriod) {
    setDraftFrequency(nextPeriod);
    if (nextPeriod === "day") {
      setDraftTarget(1);
    } else if (nextPeriod === "week") {
      setDraftTarget((current) => Math.min(7, Math.max(1, Number(current) || 1)));
    } else {
      setDraftTarget((current) => Math.min(maximumMonthlyTarget, Math.max(1, Number(current) || 1)));
    }
  }

  function save() {
    const name = draftName.trim();
    if (!name) {
      return;
    }
    onUpdate(habit.id, {
      name,
      frequencyPeriod: draftFrequency,
      targetCount: Number(draftTarget),
    });
    setIsEditing(false);
  }

  function cancel() {
    setDraftName(habit.name);
    setDraftFrequency(habit.frequencyPeriod ?? "week");
    setDraftTarget(habit.targetCount ?? habit.targetPerWeek);
    setIsEditing(false);
  }

  return (
    <article className="render-lazy-card bg-depth-panel relative overflow-hidden rounded-panel p-5 text-ink shadow-card transition duration-200 hover:brightness-110 sm:p-6">
      <span className="absolute left-6 top-0 h-1 w-14 rounded-b-full bg-accent" aria-hidden="true" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex flex-col gap-3 xl:flex-row">
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") save();
                  if (event.key === "Escape") cancel();
                }}
                className="bg-depth-control min-h-11 min-w-0 flex-1 rounded-control px-4 text-sm font-semibold text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
              <select
                value={draftFrequency}
                onChange={(event) => changeFrequency(event.target.value)}
                className="bg-depth-control min-h-11 rounded-control px-4 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent xl:w-36"
              >
                <option value="day">Pro Tag</option>
                <option value="week">Pro Woche</option>
                <option value="month">Pro Monat</option>
              </select>
              {draftFrequency === "week" ? (
                <select
                  value={draftTarget}
                  onChange={(event) => setDraftTarget(Number(event.target.value))}
                  aria-label="Häufigkeit pro Woche"
                  className="bg-depth-control min-h-11 rounded-control px-4 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent xl:w-40"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                    <option key={value} value={value}>{value}x pro Woche</option>
                  ))}
                </select>
              ) : null}
              {draftFrequency === "month" ? (
                <input
                  type="number"
                  min="1"
                  max={maximumMonthlyTarget}
                  value={draftTarget}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraftTarget(value === ""
                      ? ""
                      : Math.min(maximumMonthlyTarget, Math.max(1, Number(value))));
                  }}
                  aria-label="Häufigkeit pro Monat"
                  className="bg-depth-control min-h-11 rounded-control px-4 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent xl:w-40"
                />
              ) : null}
            </div>
          ) : (
            <>
              <h3 className="break-words text-lg font-black uppercase leading-tight text-ink sm:text-2xl">{habit.name}</h3>
              <p className="mt-2 text-[11px] font-bold uppercase text-ink">
                Ziel: {habit.frequencyPeriod === "day"
                  ? "Täglich"
                  : `${habit.targetCount ?? habit.targetPerWeek}x pro ${habit.frequencyPeriod === "month" ? "Monat" : "Woche"}`}
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={save}
                className="grid h-10 w-10 place-items-center rounded-control text-muted transition hover:bg-surface hover:text-ink"
                aria-label="Habit speichern"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={cancel}
                className="grid h-10 w-10 place-items-center rounded-control text-muted transition hover:bg-surface hover:text-ink"
                aria-label="Bearbeitung abbrechen"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="grid h-10 w-10 place-items-center rounded-control text-muted transition hover:bg-surface hover:text-ink"
              aria-label="Habit bearbeiten"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(habit.id)}
            className="grid h-10 w-10 place-items-center rounded-control text-subtle transition hover:bg-surface hover:text-ink"
            aria-label="Habit löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <HabitStatusControl habit={habit} onUpdate={onUpdate} />

      <div className="mt-1 grid gap-5 sm:grid-cols-2 sm:gap-8">
        <div className="flex items-center gap-3">
          <Flame
            className={`h-8 w-8 shrink-0 text-accent ${hasActiveStreak ? "fill-accent" : "fill-none"}`}
            strokeWidth={hasActiveStreak ? 1.75 : 2.25}
          />
          <div>
            <p className="text-[11px] font-bold uppercase text-ink">
              Streak
            </p>
            <p className="mt-0.5 text-lg font-black text-ink">
              {streakInfo.streak} {streakInfo.streak === 1 ? streakUnit[0] : streakUnit[1]} Streak
            </p>
          </div>
        </div>
        <WeeklyProgress
          streakInfo={streakInfo}
        />
      </div>
      <div className="mt-7">
        <HabitHeatmap
          monthDate={monthDate}
          viewMode={viewMode}
          completions={habit.completions}
          status={habit.status}
          pauseStart={habit.pauseStart}
          pauseEnd={habit.pauseEnd}
          onToggle={(date) => onToggle(habit.id, date)}
        />
      </div>
    </article>
  );
}
