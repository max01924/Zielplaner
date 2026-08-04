import { ArrowDownRight, ChevronDown, Link2, Plus, Save, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { checklistProgress } from "../utils/progress.js";
import ChecklistItem from "./ChecklistItem.jsx";
import ProgressBar from "./ProgressBar.jsx";
import ParentSelect from "./ParentSelect.jsx";

export default function GoalCard({
  goal,
  periodLabel,
  parentGoal = null,
  parentOptions = [],
  children = [],
  childLabel = "Unterziele",
  implementationValue = 0,
  onNavigateParent,
  onNavigateChild,
  onDeriveChild,
  onUpdateGoal,
  onDeleteGoal,
  onAddItem,
  onUpdateItem,
  onToggleItem,
  onDeleteItem,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(goal.title);
  const [draftDescription, setDraftDescription] = useState(goal.description);
  const [draftParentGoalId, setDraftParentGoalId] = useState(goal.parentGoalId);
  const [newItem, setNewItem] = useState("");
  const [showAllChildren, setShowAllChildren] = useState(false);
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
      parentGoalId: draftParentGoalId,
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
    <article className="bg-depth-panel group relative overflow-hidden rounded-panel p-5 text-ink shadow-card transition duration-200 hover:brightness-110 sm:p-6">
      <span className="absolute left-6 top-0 h-1 w-14 rounded-b-full bg-accent" aria-hidden="true" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-[11px] font-bold uppercase text-ink">{periodLabel}</p>
          {isEditing ? (
            <div className="space-y-3">
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                className="bg-depth-control w-full rounded-control px-4 py-3 text-sm font-semibold text-ink shadow-inset outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-accent"
                autoFocus
              />
              <textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                rows="2"
                className="bg-depth-control w-full resize-none rounded-control px-4 py-3 text-sm leading-relaxed text-ink shadow-inset outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-accent"
              />
              {goal.period === "monthly" ? (
                <ParentSelect
                  value={draftParentGoalId}
                  onChange={setDraftParentGoalId}
                  options={parentOptions}
                  label="Übergeordnetes Jahresziel"
                />
              ) : null}
            </div>
          ) : (
            <>
              <h3 className="text-xl font-black uppercase leading-tight text-ink sm:text-2xl">{goal.title}</h3>
              {goal.description ? (
                <p className="mt-3 max-w-prose text-sm font-normal leading-relaxed text-ink">
                  {goal.description}
                </p>
              ) : null}
              {parentGoal ? (
                <button type="button" onClick={() => onNavigateParent?.(parentGoal)} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-muted transition hover:text-ink">
                  <Link2 className="h-4 w-4 text-accent" />
                  Teil von {parentGoal.title}
                </button>
              ) : null}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={saveGoal}
                className="grid h-10 w-10 place-items-center rounded-control text-muted transition hover:bg-surface hover:text-ink"
                aria-label="Ziel speichern"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftTitle(goal.title);
                  setDraftDescription(goal.description);
                  setDraftParentGoalId(goal.parentGoalId);
                  setIsEditing(false);
                }}
                className="grid h-10 w-10 place-items-center rounded-control text-muted transition hover:bg-surface hover:text-ink"
                aria-label="Bearbeitung abbrechen"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="grid h-10 w-10 place-items-center rounded-control text-muted transition hover:bg-surface hover:text-ink"
              aria-label="Ziel bearbeiten"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const confirmed = !children.length || window.confirm(
                `${children.length} verknüpfte ${childLabel} bleiben erhalten und werden entkoppelt. Ziel trotzdem löschen?`
              );
              if (confirmed) onDeleteGoal(goal.id);
            }}
            className="grid h-10 w-10 place-items-center rounded-control text-subtle transition hover:bg-surface hover:text-ink"
            aria-label="Ziel löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ProgressBar
        label="Meilensteinfortschritt"
        value={progress}
        meta={`${goal.checklist.filter((item) => item.done).length} von ${goal.checklist.length} Teilaufgaben erledigt`}
        compact
      />

      <div className="mt-2">
        <ProgressBar
          label="Umsetzung durch Unterziele"
          value={implementationValue}
          meta={children.length ? `${children.length} ${childLabel} verknüpft` : `Noch keine ${childLabel} verknüpft`}
          compact
        />
      </div>

      <div className="mt-4 surface-divider pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-black uppercase text-ink">{childLabel}</p>
          <button type="button" onClick={() => onDeriveChild?.(goal)} className="inline-flex min-h-9 items-center gap-2 rounded-control px-3 text-xs font-bold text-muted transition hover:bg-surface-hover hover:text-ink">
            <ArrowDownRight className="h-4 w-4 text-accent" />
            Ableiten
          </button>
        </div>
        {children.length ? (
          <ul className="mt-2 space-y-1">
            {(showAllChildren ? children : children.slice(0, 3)).map((child) => (
              <li key={child.id}>
                <button type="button" onClick={() => onNavigateChild?.(child)} className="w-full rounded-control px-2 py-2 text-left text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-ink">
                  {child.title ?? child.text}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-subtle">Noch keine direkte Umsetzung verknüpft.</p>
        )}
        {children.length > 3 ? (
          <button type="button" onClick={() => setShowAllChildren((value) => !value)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-ink">
            <ChevronDown className={`h-4 w-4 transition ${showAllChildren ? "rotate-180" : ""}`} />
            {showAllChildren ? "Weniger anzeigen" : `Alle ${children.length} anzeigen`}
          </button>
        ) : null}
      </div>

      <form onSubmit={addItem} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="Neue Teilaufgabe"
          className="bg-depth-control min-h-12 flex-1 rounded-control px-4 text-sm text-ink shadow-inset outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-ink px-5 text-sm font-black text-inverse shadow-inset transition hover:bg-accent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated"
        >
          <Plus className="h-4 w-4" />
          Hinzufügen
        </button>
      </form>

      <ul className="mt-5">
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
