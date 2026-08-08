import { ArrowRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import HourSlot from "./HourSlot.jsx";
import { addDays, formatFullDate, formatWeekday } from "../utils/date.js";
import { isCurrentPeriod, periodTimeProgress } from "../utils/periodProgress.js";
import ParentSelect from "./ParentSelect.jsx";
import PeriodHeader from "./PeriodHeader.jsx";
import TaskBacklog from "./TaskBacklog.jsx";
import TimeInput from "./TimeInput.jsx";
import DailyReview from "./DailyReview.jsx";

export default function DayView({ selectedDate, onDateChange, tasks, priorities, parentPrefill, review, canReview, carryOverCount, onNavigateParent, onAddTask, onCarryOverPreviousTasks, onToggleTask, onToggleFocus, onUpdateTask, onDeleteTask, onSaveReview }) {
  const [time, setTime] = useState("");
  const [text, setText] = useState("");
  const [weeklyPriorityId, setWeeklyPriorityId] = useState(parentPrefill);
  const scheduledTasks = useMemo(
    () => tasks.filter((task) => task.time).sort((a, b) => a.time.localeCompare(b.time) || a.text.localeCompare(b.text)),
    [tasks]
  );
  const backlogTasks = useMemo(
    () => tasks.filter((task) => !task.time).sort((a, b) => a.text.localeCompare(b.text)),
    [tasks]
  );
  const completedTasks = tasks.filter((task) => task.done).length;
  const timeProgress = periodTimeProgress("day", selectedDate);
  const focusCount = scheduledTasks.filter((task) => task.isDailyFocus).length;

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

  useEffect(() => setWeeklyPriorityId(parentPrefill), [parentPrefill]);

  function submit(event) {
    event.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }

    onAddTask({ time, text: trimmedText, weeklyPriorityId });
    setTime("");
    setText("");
    setWeeklyPriorityId(null);
  }

  return (
    <section className="space-y-10">
      <PeriodHeader
        meta={formatFullDate(selectedDate)}
        title={formatWeekday(selectedDate)}
        previousAriaLabel="Vorheriger Tag"
        nextAriaLabel="Nächster Tag"
        progressLabel="Tagesfortschritt"
        isCurrent={isCurrentPeriod("day", selectedDate)}
        onPrevious={() => onDateChange(addDays(selectedDate, -1))}
        onCurrent={() => onDateChange(new Date())}
        onNext={() => onDateChange(addDays(selectedDate, 1))}
        completedTasks={completedTasks}
        totalTasks={tasks.length}
        timeProgress={timeProgress}
      />

      <form onSubmit={submit} className="bg-depth-panel rounded-panel p-5 shadow-card sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase text-subtle">Schnellerfassung</p>
            <p className="text-base font-black uppercase text-ink">Aufgabe hinzufügen</p>
          </div>
          {carryOverCount ? (
            <button
              type="button"
              onClick={onCarryOverPreviousTasks}
              className="daily-review-notice inline-flex min-h-11 max-w-[260px] items-center gap-2 rounded-control px-4 text-left text-xs font-black text-ink transition hover:brightness-125"
            >
              <ArrowRight className="h-4 w-4 shrink-0 text-accent" />
              Aufgaben vom Vortag übernehmen
            </button>
          ) : <span className="h-2 w-2 rounded-full bg-accent" />}
        </div>
        <div className="grid gap-3 lg:grid-cols-[140px_minmax(0,1fr)_minmax(220px,0.7fr)_auto] lg:items-end">
          <label>
            <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Uhrzeit optional</span>
            <TimeInput
              value={time}
              onValueChange={setTime}
              className="min-h-12 w-full rounded-control bg-canvas-deep px-4 text-sm text-ink outline-none transition focus:ring-2 focus:ring-accent"
            />
          </label>
          <label>
            <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Aufgabe</span>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="z.B. GUI fertig"
              className="min-h-12 w-full rounded-control bg-canvas-deep px-4 text-sm text-ink outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-accent"
            />
          </label>
          <ParentSelect value={weeklyPriorityId} onChange={setWeeklyPriorityId} options={priorities} label="Wochenpriorität" flat />
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-black text-accent-contrast shadow-inset transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Hinzufügen
          </button>
        </div>
      </form>

      <TaskBacklog
        tasks={backlogTasks}
        priorities={priorities}
        onNavigateParent={onNavigateParent}
        onToggleTask={onToggleTask}
        onToggleFocus={onToggleFocus}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />

      <div>
        <div className="mb-3 flex items-end justify-between gap-4 pb-2">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase text-subtle">Ablauf</p>
            <h2 className="text-2xl font-black uppercase text-ink">Tageszeitstrahl</h2>
          </div>
          <span className="bg-depth-control rounded-control px-3 py-2 text-xs font-bold text-muted shadow-inset">
            {focusCount ? `${focusCount} Fokus · ` : ""}{scheduledTasks.length} {scheduledTasks.length === 1 ? "Eintrag" : "Einträge"}
          </span>
        </div>

        {scheduledTasks.length ? (
          <ol className="pl-2 sm:pl-3">
            {scheduledTasks.map((task) => (
              <HourSlot
                key={task.id}
                task={task}
                priorities={priorities}
                parent={priorities.find((priority) => priority.id === task.weeklyPriorityId)}
                onNavigateParent={onNavigateParent}
                onToggle={() => onToggleTask(task.id)}
                onToggleFocus={() => onToggleFocus(task.id)}
                onUpdate={(updatedTask) => onUpdateTask(task.id, updatedTask)}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))}
          </ol>
        ) : (
          <div className="flat-dashed-frame flex min-h-44 items-center justify-center rounded-panel p-10 text-center text-sm text-muted sm:min-h-48 sm:p-12">
            {backlogTasks.length ? "Noch keine Aufgabe mit Uhrzeit eingeplant." : "Für diesen Tag sind noch keine Aufgaben geplant."}
          </div>
        )}
      </div>

      <DailyReview
        review={review}
        canEdit={canReview}
        onSave={onSaveReview}
      />
    </section>
  );
}
