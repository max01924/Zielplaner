import { ArrowDownRight, CalendarDays, Check, ChevronDown, Link2, Plus, Save, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { dateFromKey, dateKeyFromIsoWeek, isoWeekNumber, toIsoWeekInputValue } from "../utils/date.js";
import { checklistProgress } from "../utils/progress.js";
import ChecklistItem from "./ChecklistItem.jsx";
import ProgressBar from "./ProgressBar.jsx";
import ParentSelect from "./ParentSelect.jsx";

const weekAssignmentFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function weekAssignmentLabel(weekKey) {
  if (!weekKey) return "Noch keiner Woche zugeordnet";
  const date = dateFromKey(weekKey);
  return `KW ${isoWeekNumber(date)} · ab ${weekAssignmentFormatter.format(date)}`;
}

function MonthlyWeeklyPriorityRow({ priority, onNavigate, onToggle, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(priority.text);
  const [draftWeek, setDraftWeek] = useState(toIsoWeekInputValue(priority.weekKey));

  function startEditing() {
    setDraftText(priority.text);
    setDraftWeek(toIsoWeekInputValue(priority.weekKey));
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftText(priority.text);
    setDraftWeek(toIsoWeekInputValue(priority.weekKey));
    setIsEditing(false);
  }

  async function save() {
    const text = draftText.trim();
    if (!text) return;
    const saved = await onUpdate(priority.id, {
      text,
      weekKey: dateKeyFromIsoWeek(draftWeek),
    });
    if (saved) setIsEditing(false);
  }

  return (
    <li className="flex items-center gap-3 rounded-control px-2 py-2 transition hover:bg-surface-hover">
      <button
        type="button"
        onClick={() => onToggle(priority)}
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg transition ${
          priority.done ? "bg-accent text-accent-contrast" : "bg-canvas-deep text-transparent hover:bg-surface-hover"
        }`}
        aria-label={priority.done ? "Wochenpriorität wieder öffnen" : "Wochenpriorität abschließen"}
      >
        {priority.done ? <Check className="h-4 w-4" /> : null}
      </button>

      {isEditing ? (
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_165px]">
          <input
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            className="bg-depth-control min-h-10 min-w-0 rounded-control px-3 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent"
            aria-label="Name der Wochenpriorität"
            autoFocus
          />
          <input
            type="week"
            value={draftWeek}
            onChange={(event) => setDraftWeek(event.target.value)}
            className="bg-depth-control min-h-10 min-w-0 rounded-control px-3 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent"
            aria-label="Kalenderwoche der Wochenpriorität"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => priority.weekKey && onNavigate?.(priority)}
          disabled={!priority.weekKey}
          className="min-w-0 flex-1 py-1 text-left disabled:cursor-default"
        >
          <span className={`block text-sm font-semibold text-muted ${priority.done ? "line-through" : ""}`}>
            {priority.text}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-subtle">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            {weekAssignmentLabel(priority.weekKey)}
          </span>
        </button>
      )}

      <div className="flex shrink-0 items-center gap-1">
        {isEditing ? (
          <>
            <button type="button" onClick={save} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink" aria-label="Wochenpriorität speichern">
              <Save className="h-4 w-4" />
            </button>
            <button type="button" onClick={cancelEditing} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink" aria-label="Bearbeitung abbrechen">
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button type="button" onClick={startEditing} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink" aria-label="Wochenpriorität bearbeiten">
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Wochenpriorität wirklich löschen?")) onDelete(priority.id);
          }}
          className="grid h-9 w-9 place-items-center rounded-lg text-subtle transition hover:bg-surface hover:text-ink"
          aria-label="Wochenpriorität löschen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

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
  onAddChild,
  onToggleChild,
  onUpdateChild,
  onDeleteChild,
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
  const [newChildWeek, setNewChildWeek] = useState("");
  const [showAllChildren, setShowAllChildren] = useState(false);
  const progress = checklistProgress(goal.checklist);
  const completedItems = goal.checklist.filter((item) => item.done).length;
  const isMonthlyPriority = goal.period === "monthly";

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
    if (isMonthlyPriority) {
      onAddChild?.(goal.id, {
        text,
        weekKey: dateKeyFromIsoWeek(newChildWeek),
      });
      setNewChildWeek("");
    } else {
      onAddItem(goal.id, text);
    }
    setNewItem("");
  }

  return (
    <article className="render-lazy-card bg-depth-panel group relative overflow-hidden rounded-panel p-5 text-ink shadow-card transition duration-200 hover:brightness-110 sm:p-6">
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

      {isMonthlyPriority ? (
        <ProgressBar
          label="Fortschritt"
          value={implementationValue}
          meta={`${children.filter((child) => child.done).length} von ${children.length} Wochenprioritäten erledigt`}
          compact
        />
      ) : (
        <>
          <ProgressBar
            label="Meilensteinfortschritt"
            value={progress}
            meta={`${completedItems} von ${goal.checklist.length} Teilaufgaben erledigt`}
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
        </>
      )}

      {isMonthlyPriority ? (
        <form onSubmit={addItem} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px_auto] sm:items-end">
          <label className="min-w-0">
            <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Wochenpriorität</span>
            <input
              value={newItem}
              onChange={(event) => setNewItem(event.target.value)}
              placeholder="Neue Wochenpriorität"
              className="bg-depth-control min-h-12 w-full rounded-control px-4 text-sm text-ink shadow-inset outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-accent"
            />
          </label>
          <label className="min-w-0">
            <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Kalenderwoche optional</span>
            <input
              type="week"
              value={newChildWeek}
              onChange={(event) => setNewChildWeek(event.target.value)}
              className="bg-depth-control min-h-12 w-full rounded-control px-3 text-sm text-ink shadow-inset outline-none transition focus:ring-2 focus:ring-accent"
              aria-label="Kalenderwoche für neue Wochenpriorität"
            />
          </label>
          <button
            type="submit"
            disabled={!newItem.trim()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-ink px-5 text-sm font-black text-inverse shadow-inset transition hover:bg-accent hover:text-accent-contrast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated"
          >
            <Plus className="h-4 w-4" />
            Hinzufügen
          </button>
        </form>
      ) : null}

      <div className={`${isMonthlyPriority ? "mt-4" : "mt-4 surface-divider pb-4"}`}>
        {!isMonthlyPriority ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-black uppercase text-ink">{childLabel}</p>
            <button type="button" onClick={() => onDeriveChild?.(goal)} className="inline-flex min-h-9 items-center gap-2 rounded-control px-3 text-xs font-bold text-muted transition hover:bg-surface-hover hover:text-ink">
              <ArrowDownRight className="h-4 w-4 text-accent" />
              Ableiten
            </button>
          </div>
        ) : null}
        {children.length ? (
          <ul className={`${isMonthlyPriority ? "space-y-1" : "mt-2 space-y-1"}`}>
            {(showAllChildren ? children : children.slice(0, 3)).map((child) => (
              isMonthlyPriority ? (
                <MonthlyWeeklyPriorityRow
                  key={child.id}
                  priority={child}
                  onNavigate={onNavigateChild}
                  onToggle={onToggleChild}
                  onUpdate={onUpdateChild}
                  onDelete={onDeleteChild}
                />
              ) : (
                <li key={child.id} className="rounded-control transition hover:bg-surface-hover">
                  <button type="button" onClick={() => onNavigateChild?.(child)} className="w-full px-2 py-2 text-left">
                    <span className="block text-sm font-semibold text-muted">{child.title ?? child.text}</span>
                  </button>
                </li>
              )
            ))}
          </ul>
        ) : !isMonthlyPriority ? (
          <p className="mt-2 text-sm text-subtle">Noch keine direkte Umsetzung verknüpft.</p>
        ) : null}
        {children.length > 3 ? (
          <button type="button" onClick={() => setShowAllChildren((value) => !value)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-ink">
            <ChevronDown className={`h-4 w-4 transition ${showAllChildren ? "rotate-180" : ""}`} />
            {showAllChildren ? "Weniger anzeigen" : `Alle ${children.length} anzeigen`}
          </button>
        ) : null}
      </div>

      {!isMonthlyPriority ? <form onSubmit={addItem} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="Neue Teilaufgabe"
          className="bg-depth-control min-h-12 flex-1 rounded-control px-4 text-sm text-ink shadow-inset outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-ink px-5 text-sm font-black text-inverse shadow-inset transition hover:bg-accent hover:text-accent-contrast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated"
        >
          <Plus className="h-4 w-4" />
          Hinzufügen
        </button>
      </form> : null}

      {!isMonthlyPriority ? <ul className="mt-5">
        {goal.checklist.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            onToggle={() => onToggleItem(goal.id, item.id, !item.done)}
            onUpdate={(text) => onUpdateItem(goal.id, item.id, text)}
            onDelete={() => onDeleteItem(goal.id, item.id)}
          />
        ))}
      </ul> : null}
    </article>
  );
}
