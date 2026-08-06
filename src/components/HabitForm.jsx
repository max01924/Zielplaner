import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { daysInMonth } from "../utils/date.js";

export default function HabitForm({ monthDate, onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [frequencyPeriod, setFrequencyPeriod] = useState("week");
  const [targetCount, setTargetCount] = useState(7);
  const maximumMonthlyTarget = daysInMonth(monthDate);

  useEffect(() => {
    if (frequencyPeriod === "month") {
      setTargetCount((current) => Math.min(maximumMonthlyTarget, Math.max(1, Number(current) || 1)));
    }
  }, [frequencyPeriod, maximumMonthlyTarget]);

  function changeFrequency(nextPeriod) {
    setFrequencyPeriod(nextPeriod);
    if (nextPeriod === "day") {
      setTargetCount(1);
    } else if (nextPeriod === "week") {
      setTargetCount((current) => Math.min(7, Math.max(1, Number(current) || 1)));
    } else {
      setTargetCount((current) => Math.min(maximumMonthlyTarget, Math.max(1, Number(current) || 1)));
    }
  }

  function changeMonthlyTarget(value) {
    if (value === "") {
      setTargetCount("");
      return;
    }
    setTargetCount(Math.min(maximumMonthlyTarget, Math.max(1, Number(value))));
  }

  function submit(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    onCreate({ name: trimmedName, frequencyPeriod, targetCount: Number(targetCount) || 1 });
    setName("");
    setFrequencyPeriod("week");
    setTargetCount(7);
  }

  return (
    <form onSubmit={submit} className="bg-depth-panel rounded-panel p-5 shadow-card sm:p-6">
      <div className="mb-5">
        <p className="mb-1 text-[10px] font-bold uppercase text-subtle">Neue Routine</p>
        <p className="text-base font-black uppercase text-ink">Habit anlegen</p>
      </div>
      <div className="flex flex-col gap-3 xl:flex-row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Habit"
          className="bg-depth-control min-h-12 min-w-0 flex-1 rounded-control px-4 text-sm text-ink shadow-inset outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-accent"
          autoFocus
        />
        <select
          value={frequencyPeriod}
          onChange={(event) => changeFrequency(event.target.value)}
          className="bg-depth-control min-h-12 rounded-control px-4 text-sm text-ink shadow-inset outline-none transition focus:ring-2 focus:ring-accent xl:w-40"
        >
          <option value="day">Pro Tag</option>
          <option value="week">Pro Woche</option>
          <option value="month">Pro Monat</option>
        </select>
        {frequencyPeriod === "week" ? (
          <select
            value={targetCount}
            onChange={(event) => setTargetCount(Number(event.target.value))}
            aria-label="Häufigkeit pro Woche"
            className="bg-depth-control min-h-12 rounded-control px-4 text-sm text-ink shadow-inset outline-none transition focus:ring-2 focus:ring-accent xl:w-44"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((value) => (
              <option key={value} value={value}>{value}x pro Woche</option>
            ))}
          </select>
        ) : null}
        {frequencyPeriod === "month" ? (
          <input
            type="number"
            min="1"
            max={maximumMonthlyTarget}
            value={targetCount}
            onChange={(event) => changeMonthlyTarget(event.target.value)}
            aria-label="Häufigkeit pro Monat"
            className="bg-depth-control min-h-12 rounded-control px-4 text-sm text-ink shadow-inset outline-none transition focus:ring-2 focus:ring-accent xl:w-44"
          />
        ) : null}
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-black text-accent-contrast shadow-inset transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Hinzufügen
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-depth-control inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 text-sm font-bold text-muted shadow-inset transition hover:brightness-125 hover:text-ink"
        >
          <X className="h-4 w-4" />
          Abbrechen
        </button>
      </div>
    </form>
  );
}
