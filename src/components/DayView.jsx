import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DateNavigator from "./DateNavigator.jsx";
import HourSlot from "./HourSlot.jsx";
import ProgressBar from "./ProgressBar.jsx";
import { checklistProgress, clampPercent } from "../utils/progress.js";
import { toDateKey } from "../utils/date.js";

function dayProgress(selectedDate) {
  const now = new Date();
  const selectedKey = toDateKey(selectedDate);
  const todayKey = toDateKey(now);

  if (selectedKey < todayKey) {
    return 100;
  }
  if (selectedKey > todayKey) {
    return 0;
  }

  return clampPercent(((now.getHours() + now.getMinutes() / 60) / 24) * 100);
}

export default function DayView({ selectedDate, onDateChange, tasks, onAddTask, onToggleTask, onUpdateTask, onDeleteTask }) {
  const [time, setTime] = useState("09:00");
  const [text, setText] = useState("");
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.time.localeCompare(b.time) || a.text.localeCompare(b.text)),
    [tasks]
  );
  const taskProgress = checklistProgress(tasks);
  const timeProgress = dayProgress(selectedDate);

  useEffect(() => {
    function handleKeyDown(event) {
      if (
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowRight"
      ) {
        return;
      }

      const tagName = document.activeElement?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA") {
        return;
      }

      event.preventDefault();
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + (event.key === "ArrowRight" ? 1 : -1));
      onDateChange(next);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDateChange, selectedDate]);

  function submit(event) {
    event.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }

    onAddTask({ time, text: trimmedText });
    setText("");
  }

  return (
    <section className="space-y-5">
      <DateNavigator selectedDate={selectedDate} onChange={onDateChange} />

      <div className="grid gap-3 lg:grid-cols-2">
        <ProgressBar
          label="Tagesaufgaben"
          value={taskProgress}
          meta={`${tasks.filter((task) => task.done).length} von ${tasks.length} Aufgaben erledigt`}
        />
        <ProgressBar
          label="Tagesfortschritt"
          value={timeProgress}
          meta="Berechnet aus bereits vergangenen Stunden"
        />
      </div>

      <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="mb-3 text-sm font-bold text-slate-950 dark:text-white">Aufgabe zur Stunde hinzufügen</p>
        <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto]">
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="z.B. GUI fertig"
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
          >
            <Plus className="h-4 w-4" />
            Hinzufügen
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-sky-100 bg-sky-50/80 p-4 shadow-sm dark:border-sky-900/70 dark:bg-sky-950/30">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950 dark:text-sky-50">Tageszeitstrahl</h2>
          <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
            {sortedTasks.length} Einträge
          </span>
        </div>

        {sortedTasks.length ? (
          <ol className="pl-2">
            {sortedTasks.map((task) => (
              <HourSlot
                key={task.id}
                task={task}
                onToggle={() => onToggleTask(task.id)}
                onUpdate={(updatedTask) => onUpdateTask(task.id, updatedTask)}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))}
          </ol>
        ) : (
          <div className="rounded-lg border border-dashed border-sky-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-sky-800 dark:bg-slate-950 dark:text-slate-400">
            Für diesen Tag sind noch keine Aufgaben geplant.
          </div>
        )}
      </div>
    </section>
  );
}
