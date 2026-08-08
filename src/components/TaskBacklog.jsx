import { Check, Inbox, Link2, Pencil, Save, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import { isoWeekKeyFromDateKey } from "../utils/date.js";
import ParentSelect from "./ParentSelect.jsx";
import TimeInput from "./TimeInput.jsx";

function BacklogItem({ task, priorities, parent, onNavigateParent, onToggle, onToggleFocus, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftDateKey, setDraftDateKey] = useState(task.dateKey);
  const [draftTime, setDraftTime] = useState("");
  const [draftText, setDraftText] = useState(task.text);
  const [draftPriorityId, setDraftPriorityId] = useState(task.weeklyPriorityId);
  const staysInCurrentWeek = isoWeekKeyFromDateKey(draftDateKey) === isoWeekKeyFromDateKey(task.dateKey);

  function cancel() {
    setDraftDateKey(task.dateKey);
    setDraftTime("");
    setDraftText(task.text);
    setDraftPriorityId(task.weeklyPriorityId);
    setIsEditing(false);
  }

  async function save() {
    const text = draftText.trim();
    if (!text) return;
    const saved = await onUpdate({
      ...task,
      dateKey: draftDateKey,
      time: draftTime,
      text,
      weeklyPriorityId: staysInCurrentWeek ? draftPriorityId : null,
    });
    if (saved !== false) setIsEditing(false);
  }

  return (
    <li className={`bg-depth-panel relative overflow-hidden rounded-2xl p-4 shadow-card transition hover:brightness-110 ${
      task.isDailyFocus ? "daily-focus-glow" : ""
    }`}>
      {task.isDailyFocus ? (
        <span className="absolute inset-y-4 left-0 z-20 w-1 rounded-r-full bg-accent" aria-hidden="true" />
      ) : null}
      <div className="relative z-10 flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className={`grid h-6 w-6 shrink-0 self-center place-items-center rounded-lg transition ${
            task.done ? "bg-accent text-accent-contrast" : "bg-canvas-deep text-transparent hover:bg-surface-hover"
          }`}
          aria-label={task.done ? "Aufgabe wieder öffnen" : "Aufgabe abschließen"}
        >
          {task.done ? <Check className="h-4 w-4" /> : null}
        </button>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[150px_140px_minmax(0,1fr)_minmax(220px,0.7fr)]">
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Datum</span>
                <input
                  type="date"
                  value={draftDateKey}
                  onChange={(event) => {
                    setDraftDateKey(event.target.value);
                    if (isoWeekKeyFromDateKey(event.target.value) !== isoWeekKeyFromDateKey(task.dateKey)) {
                      setDraftPriorityId(null);
                    }
                  }}
                  className="bg-depth-control min-h-11 w-full rounded-control px-3 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Einplanen um</span>
                <TimeInput
                  value={draftTime}
                  onValueChange={setDraftTime}
                  className="bg-depth-control min-h-11 w-full rounded-control px-3 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
              </label>
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Aufgabe</span>
                <input
                  value={draftText}
                  onChange={(event) => setDraftText(event.target.value)}
                  className="bg-depth-control min-h-11 w-full rounded-control px-3 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
              <ParentSelect
                value={draftPriorityId}
                onChange={setDraftPriorityId}
                options={staysInCurrentWeek ? priorities : []}
                label="Wochenpriorität"
                disabled={!staysInCurrentWeek}
              />
            </div>
          ) : (
            <>
              <p className={`text-sm font-semibold leading-relaxed ${task.done ? "text-muted line-through" : "text-ink"}`}>{task.text}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase text-subtle">
                <span>Lege eine Uhrzeit fest</span>
                {parent ? (
                  <button type="button" onClick={() => onNavigateParent(parent)} className="inline-flex items-center gap-1.5 transition hover:text-ink">
                    <Link2 className="h-3.5 w-3.5 text-accent" />
                    {parent.text}
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isEditing ? (
            <>
              <button type="button" onClick={save} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink" aria-label="Vorratsaufgabe speichern">
                <Save className="h-4 w-4" />
              </button>
              <button type="button" onClick={cancel} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink" aria-label="Bearbeitung abbrechen">
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onToggleFocus}
                className={`grid h-9 w-9 place-items-center rounded-lg transition hover:bg-surface hover:text-ink ${task.isDailyFocus ? "text-accent" : "text-subtle"}`}
                aria-label={task.isDailyFocus ? "Tagesfokus entfernen" : "Als Tagesfokus markieren"}
                title={task.isDailyFocus ? "Tagesfokus entfernen" : "Als Tagesfokus markieren"}
                aria-pressed={task.isDailyFocus}
              >
                <Star className={`h-4 w-4 ${task.isDailyFocus ? "fill-current" : ""}`} />
              </button>
              <button type="button" onClick={() => setIsEditing(true)} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink" aria-label="Vorratsaufgabe bearbeiten oder einplanen">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-lg text-subtle transition hover:bg-surface hover:text-ink" aria-label="Vorratsaufgabe löschen">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export default function TaskBacklog({ tasks, priorities, onNavigateParent, onToggleTask, onToggleFocus, onUpdateTask, onDeleteTask }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4 pb-2">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase text-subtle">Lege eine Uhrzeit fest</p>
          <h2 className="text-2xl font-black uppercase text-ink">Archiv</h2>
        </div>
        <span className="bg-depth-control rounded-control px-3 py-2 text-xs font-bold text-muted shadow-inset">
          {tasks.length} {tasks.length === 1 ? "Eintrag" : "Einträge"}
        </span>
      </div>

      {tasks.length ? (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <BacklogItem
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
        </ul>
      ) : (
        <div className="flat-dashed-frame flex min-h-44 items-center justify-center gap-3 rounded-panel p-10 text-sm text-muted sm:min-h-48 sm:p-12">
          <Inbox className="h-5 w-5 text-subtle" />
          Keine Aufgaben im Archiv.
        </div>
      )}
    </section>
  );
}
