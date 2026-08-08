import { Check, Link2, Pencil, Save, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import { formatDateKey, isoWeekKeyFromDateKey } from "../utils/date.js";
import ParentSelect from "./ParentSelect.jsx";
import TimeInput from "./TimeInput.jsx";

export default function HourSlot({ task, priorities, parent, onNavigateParent, onToggle, onToggleFocus, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftDateKey, setDraftDateKey] = useState(task.dateKey);
  const [draftTime, setDraftTime] = useState(task.time);
  const [draftText, setDraftText] = useState(task.text);
  const [draftPriorityId, setDraftPriorityId] = useState(task.weeklyPriorityId);
  const staysInCurrentWeek = isoWeekKeyFromDateKey(draftDateKey) === isoWeekKeyFromDateKey(task.dateKey);

  async function save() {
    const text = draftText.trim();
    if (!text) {
      return;
    }
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
    <li className="render-lazy-row relative grid gap-3 border-l border-line pb-4 pl-5 last:pb-0 sm:grid-cols-[72px_1fr] sm:gap-4">
      <span className="absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full bg-accent shadow-card" />
      <time className="pt-1 text-xs font-black uppercase text-ink">{task.time}</time>
      <div className={`bg-depth-panel relative overflow-hidden rounded-2xl p-4 shadow-card transition hover:brightness-110 sm:p-5 ${
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
              task.done
                ? "bg-accent text-accent-contrast"
                : "bg-canvas-deep text-transparent hover:bg-surface-hover"
            }`}
            aria-label={task.done ? "Aufgabe als offen markieren" : "Aufgabe abhaken"}
          >
            {task.done ? <Check className="h-4 w-4" /> : null}
          </button>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="grid gap-3 sm:grid-cols-[150px_128px_minmax(0,1fr)]">
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
                    className="min-h-10 w-full rounded-xl bg-canvas-deep px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Uhrzeit</span>
                  <TimeInput
                    value={draftTime}
                    onValueChange={setDraftTime}
                    className="min-h-10 w-full rounded-xl bg-canvas-deep px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Aufgabe</span>
                  <input
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") save();
                      if (event.key === "Escape") setIsEditing(false);
                    }}
                    className="min-h-10 w-full rounded-xl bg-canvas-deep px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent"
                    autoFocus
                  />
                </label>
                <div className="sm:col-span-3">
                  <ParentSelect
                    value={draftPriorityId}
                    onChange={setDraftPriorityId}
                    options={staysInCurrentWeek ? priorities : []}
                    label="Wochenpriorität"
                    disabled={!staysInCurrentWeek}
                    flat
                  />
                </div>
              </div>
            ) : (
              <>
                <p className={`text-sm leading-relaxed ${task.done ? "text-subtle line-through" : "font-medium text-ink"}`}>{task.text}</p>
                {task.postponedFromDate || parent ? (
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold uppercase text-muted">
                    {task.postponedFromDate ? (
                      <span>Aufgeschoben seit {formatDateKey(task.postponedFromDate)}</span>
                    ) : null}
                    {task.postponedFromDate && parent ? <span aria-hidden="true">·</span> : null}
                    {parent ? (
                      <button type="button" onClick={() => onNavigateParent(parent)} className="inline-flex items-center gap-2 hover:text-ink">
                        <Link2 className="h-3.5 w-3.5 text-accent" />
                        {parent.text}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {!isEditing ? (
              <button
                type="button"
                onClick={onToggleFocus}
                className={`grid h-9 w-9 place-items-center rounded-lg transition hover:bg-surface hover:text-ink ${
                  task.isDailyFocus ? "text-accent" : "text-subtle"
                }`}
                aria-label={task.isDailyFocus ? "Tagesfokus entfernen" : "Als Tagesfokus markieren"}
                title={task.isDailyFocus ? "Tagesfokus entfernen" : "Als Tagesfokus markieren"}
                aria-pressed={task.isDailyFocus}
              >
                <Star className={`h-4 w-4 ${task.isDailyFocus ? "fill-current" : ""}`} />
              </button>
            ) : null}
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={save}
                  className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
                  aria-label="Aufgabe speichern"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftDateKey(task.dateKey);
                    setDraftTime(task.time);
                    setDraftText(task.text);
                    setDraftPriorityId(task.weeklyPriorityId);
                    setIsEditing(false);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
                  aria-label="Bearbeitung abbrechen"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
                aria-label="Aufgabe bearbeiten"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="grid h-9 w-9 place-items-center rounded-lg text-subtle transition hover:bg-surface hover:text-ink"
              aria-label="Aufgabe löschen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
