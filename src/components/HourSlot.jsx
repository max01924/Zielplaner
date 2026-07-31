import { Check, Pencil, Save, Trash2, X } from "lucide-react";
import { useState } from "react";

export default function HourSlot({ task, onToggle, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTime, setDraftTime] = useState(task.time);
  const [draftText, setDraftText] = useState(task.text);

  function save() {
    const text = draftText.trim();
    if (!text) {
      return;
    }
    onUpdate({ ...task, time: draftTime, text });
    setIsEditing(false);
  }

  return (
    <li className="relative grid gap-3 border-l-2 border-sky-200 pb-4 pl-5 last:pb-0 dark:border-sky-900 sm:grid-cols-[88px_1fr] sm:gap-5">
      <span className="absolute -left-[7px] top-2 h-3 w-3 rounded-full border-2 border-white bg-sky-500 shadow dark:border-slate-950" />
      <time className="text-sm font-black text-slate-950 dark:text-sky-100">{task.time}</time>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onToggle}
            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded border ${
              task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
            }`}
            aria-label={task.done ? "Aufgabe als offen markieren" : "Aufgabe abhaken"}
          >
            {task.done ? <Check className="h-4 w-4" /> : null}
          </button>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="grid gap-2 sm:grid-cols-[128px_1fr]">
                <input
                  type="time"
                  value={draftTime}
                  onChange={(event) => setDraftTime(event.target.value)}
                  className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                  value={draftText}
                  onChange={(event) => setDraftText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") save();
                    if (event.key === "Escape") setIsEditing(false);
                  }}
                  className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  autoFocus
                />
              </div>
            ) : (
              <p className={`text-sm ${task.done ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-800 dark:text-slate-100"}`}>
                {task.text}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={save}
                  className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Aufgabe speichern"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftTime(task.time);
                    setDraftText(task.text);
                    setIsEditing(false);
                  }}
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
                aria-label="Aufgabe bearbeiten"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="grid h-9 w-9 place-items-center rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
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
