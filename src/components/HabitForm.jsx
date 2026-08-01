import { Plus, X } from "lucide-react";
import { useState } from "react";

export default function HabitForm({ onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [targetPerWeek, setTargetPerWeek] = useState(7);

  function submit(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    onCreate({ name: trimmedName, targetPerWeek });
    setName("");
    setTargetPerWeek(7);
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid gap-3 md:grid-cols-[1fr_160px_auto_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Habit"
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          autoFocus
        />
        <select
          value={targetPerWeek}
          onChange={(event) => setTargetPerWeek(Number(event.target.value))}
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((value) => (
            <option key={value} value={value}>
              {value}x pro Woche
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
        >
          <Plus className="h-4 w-4" />
          Hinzufügen
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
          Abbrechen
        </button>
      </div>
    </form>
  );
}
