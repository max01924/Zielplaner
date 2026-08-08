import { Check, ChevronRight } from "lucide-react";
import { formatDateKey } from "../utils/date.js";

const dayFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});
function taskDay(dateKey) {
  return dayFormatter.format(new Date(`${dateKey}T12:00:00`));
}

export function WeeklyTaskRow({ task, onToggle, onNavigate }) {
  return (
    <li className="bg-depth-panel rounded-2xl p-4 shadow-card transition hover:brightness-110 sm:p-5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(task)}
          className={`grid h-6 w-6 shrink-0 self-center place-items-center rounded-lg transition ${
            task.done ? "bg-accent text-accent-contrast" : "bg-canvas-deep text-transparent hover:bg-surface-hover"
          }`}
          aria-label={task.done ? "Aufgabe wieder öffnen" : "Aufgabe abschließen"}
        >
          {task.done ? <Check className="h-4 w-4" /> : null}
        </button>
        <button
          type="button"
          onClick={() => onNavigate(task)}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={`${task.text} am ${taskDay(task.dateKey)} öffnen`}
        >
          <span className="min-w-0 flex-1">
            <span className={`block text-sm font-semibold leading-relaxed ${task.done ? "text-muted line-through" : "text-ink"}`}>
              {task.text}
            </span>
            <span className="mt-1.5 block text-xs font-semibold text-muted">
              {taskDay(task.dateKey)} · {task.time || "Ohne Uhrzeit"}
              {task.postponedFromDate ? (
                <span className="ml-2">
                  · Aufgeschoben seit {formatDateKey(task.postponedFromDate)}
                </span>
              ) : null}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-accent" />
        </button>
      </div>
    </li>
  );
}

export default function WeeklyTasks({ tasks, onToggle, onNavigate }) {
  const done = tasks.filter((task) => task.done).length;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4 pb-2">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase text-subtle">Umsetzung</p>
          <h2 className="text-2xl font-black uppercase text-ink">Tagesaufgaben in dieser Woche</h2>
        </div>
        <span className="bg-depth-control shrink-0 whitespace-nowrap rounded-control px-3 py-2 text-xs font-bold text-muted shadow-inset">
          {done} / {tasks.length}
        </span>
      </div>

      {tasks.length ? (
        <ul className="space-y-3">
          {tasks.map((task) => <WeeklyTaskRow key={task.id} task={task} onToggle={onToggle} onNavigate={onNavigate} />)}
        </ul>
      ) : (
        <div className="flat-dashed-frame flex min-h-44 items-center justify-center rounded-panel p-10 text-center text-sm text-muted sm:min-h-48 sm:p-12">
          Für diese Woche sind noch keine Tagesaufgaben geplant.
        </div>
      )}
    </section>
  );
}
