import { Plus, Save, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { checklistProgress } from "../utils/progress.js";
import ChecklistItem from "./ChecklistItem.jsx";
import ProgressBar from "./ProgressBar.jsx";

export default function GoalCard({ goal, periodLabel, onUpdateGoal, onDeleteGoal, onAddItem, onUpdateItem, onToggleItem, onDeleteItem }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(goal.title);
  const [draftDescription, setDraftDescription] = useState(goal.description);
  const [newItem, setNewItem] = useState("");
  const progress = checklistProgress(goal.checklist);

  function saveGoal() {
    const title = draftTitle.trim();
    if (!title) {
      return;
    }
    onUpdateGoal({
      ...goal,
      title,
      description: draftDescription.trim(),
    });
    setIsEditing(false);
  }

  function addItem(event) {
    event.preventDefault();
    const text = newItem.trim();
    if (!text) {
      return;
    }
    onAddItem(goal.id, text);
    setNewItem("");
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{periodLabel}</p>
          {isEditing ? (
            <div className="space-y-2">
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                autoFocus
              />
              <textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                rows="2"
                className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          ) : (
            <>
              <h3 className="text-lg font-black text-slate-950 dark:text-white">{goal.title}</h3>
              {goal.description ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{goal.description}</p> : null}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={saveGoal}
                className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Ziel speichern"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftTitle(goal.title);
                  setDraftDescription(goal.description);
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
              aria-label="Ziel bearbeiten"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDeleteGoal(goal.id)}
            className="grid h-9 w-9 place-items-center rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            aria-label="Ziel löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ProgressBar
        label="Ziel-Fortschritt"
        value={progress}
        meta={`${goal.checklist.filter((item) => item.done).length} von ${goal.checklist.length} Teilaufgaben erledigt`}
      />

      <form onSubmit={addItem} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="Neue Teilaufgabe"
          className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
        >
          <Plus className="h-4 w-4" />
          Hinzufügen
        </button>
      </form>

      <ul className="mt-4 space-y-2">
        {goal.checklist.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            onToggle={() => onToggleItem(goal.id, item.id, !item.done)}
            onUpdate={(text) => onUpdateItem(goal.id, item.id, text)}
            onDelete={() => onDeleteItem(goal.id, item.id)}
          />
        ))}
      </ul>
    </article>
  );
}
