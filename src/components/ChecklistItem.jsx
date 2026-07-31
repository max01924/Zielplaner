import { Check, Pencil, Save, Trash2, X } from "lucide-react";
import { useState } from "react";

export default function ChecklistItem({ item, onToggle, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  function save() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    onUpdate(text);
    setIsEditing(false);
  }

  return (
    <li className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded border ${
          item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
        }`}
        aria-label={item.done ? "Teilaufgabe als offen markieren" : "Teilaufgabe abhaken"}
      >
        {item.done ? <Check className="h-4 w-4" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
              if (event.key === "Escape") setIsEditing(false);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            autoFocus
          />
        ) : (
          <p className={`text-sm ${item.done ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-800 dark:text-slate-100"}`}>
            {item.text}
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
              aria-label="Teilaufgabe speichern"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(item.text);
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
            aria-label="Teilaufgabe bearbeiten"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="grid h-9 w-9 place-items-center rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          aria-label="Teilaufgabe löschen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
