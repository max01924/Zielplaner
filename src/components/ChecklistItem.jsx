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
    <li className="surface-divider flex items-start gap-3 py-3.5 transition last:bg-none hover:bg-white/[0.04] sm:px-2">
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-control shadow-inset transition ${
          item.done
            ? "bg-accent text-accent-contrast"
            : "bg-depth-inset text-transparent hover:brightness-125"
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
            className="bg-depth-inset w-full rounded-control px-3 py-2 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent"
            autoFocus
          />
        ) : (
          <p className={`text-sm leading-relaxed ${item.done ? "text-ink line-through" : "text-ink"}`}>
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
              className="grid h-9 w-9 place-items-center rounded-control text-muted transition hover:bg-surface-hover hover:text-ink"
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
              className="grid h-9 w-9 place-items-center rounded-control text-muted transition hover:bg-surface-hover hover:text-ink"
              aria-label="Bearbeitung abbrechen"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="grid h-9 w-9 place-items-center rounded-control text-muted transition hover:bg-surface-hover hover:text-ink"
            aria-label="Teilaufgabe bearbeiten"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="grid h-9 w-9 place-items-center rounded-control text-subtle transition hover:bg-surface-hover hover:text-ink"
          aria-label="Teilaufgabe löschen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
