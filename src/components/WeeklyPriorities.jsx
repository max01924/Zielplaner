import { Archive, CalendarPlus, Check, ChevronDown, Link2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { addDays, toMonthKey } from "../utils/date.js";
import ParentSelect from "./ParentSelect.jsx";

function PriorityRow({ priority, parent, parentOptions, linkedTasks, onNavigateParent, onNavigateTask, onDeriveTask, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(priority.text);
  const [draftParentId, setDraftParentId] = useState(priority.monthlyGoalId);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const doneTasks = linkedTasks.filter((task) => task.done).length;

  function save() {
    const text = draft.trim();
    if (!text) return;
    onUpdate(priority.id, { text, monthlyGoalId: draftParentId });
    setIsEditing(false);
  }

  function cancel() {
    setDraft(priority.text);
    setDraftParentId(priority.monthlyGoalId);
    setIsEditing(false);
  }

  return (
    <li className="bg-depth-panel rounded-2xl p-4 shadow-card transition hover:brightness-110 sm:p-5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onUpdate(priority.id, { done: !priority.done })}
          className={`grid h-6 w-6 shrink-0 self-center place-items-center rounded-lg transition ${
            priority.done ? "bg-accent text-accent-contrast" : "bg-canvas-deep text-transparent hover:bg-surface-hover"
          }`}
          aria-label={priority.done ? "Priorität wieder öffnen" : "Priorität abschließen"}
        >
          {priority.done ? <Check className="h-4 w-4" /> : null}
        </button>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") save();
                  if (event.key === "Escape") cancel();
                }}
                className="bg-depth-control min-h-11 w-full rounded-control px-4 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
              <ParentSelect value={draftParentId} onChange={setDraftParentId} options={parentOptions} label="Monatspriorität verknüpfen" />
            </div>
          ) : (
            <>
              <p className={`text-sm font-semibold leading-relaxed ${priority.done ? "text-muted line-through" : "text-ink"}`}>
                {priority.text}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold uppercase text-subtle">
                <span>{doneTasks} von {linkedTasks.length} Tagesaufgaben</span>
                {parent ? (
                  <button type="button" onClick={() => onNavigateParent(parent)} className="inline-flex items-center gap-1.5 transition hover:text-ink">
                    <Link2 className="h-3.5 w-3.5 text-accent" />
                    {parent.title}
                  </button>
                ) : null}
              </div>

              {linkedTasks.length ? (
                <div className="mt-3">
                  <ul className="space-y-1">
                    {(showAllTasks ? linkedTasks : linkedTasks.slice(0, 3)).map((task) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => onNavigateTask(task)}
                          className="flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-surface-hover"
                        >
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${task.done ? "bg-accent" : "bg-subtle"}`} />
                          <span className="min-w-0">
                            <span className={`block text-xs font-semibold ${task.done ? "text-subtle line-through" : "text-muted"}`}>{task.text}</span>
                            <span className="mt-0.5 block text-[9px] font-bold uppercase text-subtle">
                              {task.dateKey.slice(8, 10)}.{task.dateKey.slice(5, 7)}. · {task.time || "Ohne Uhrzeit"}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {linkedTasks.length > 3 ? (
                    <button type="button" onClick={() => setShowAllTasks((value) => !value)} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-ink">
                      <ChevronDown className={`h-4 w-4 transition ${showAllTasks ? "rotate-180" : ""}`} />
                      {showAllTasks ? "Weniger anzeigen" : `Alle ${linkedTasks.length} anzeigen`}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <button type="button" onClick={() => onDeriveTask(priority)} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-control px-3 text-xs font-bold text-muted transition hover:bg-surface-hover hover:text-ink">
                <CalendarPlus className="h-4 w-4 text-accent" />
                Tagesaufgabe planen
              </button>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isEditing ? (
            <>
              <button type="button" onClick={save} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink" aria-label="Priorität speichern"><Save className="h-4 w-4" /></button>
              <button type="button" onClick={cancel} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink" aria-label="Bearbeitung abbrechen"><X className="h-4 w-4" /></button>
            </>
          ) : (
            <button type="button" onClick={() => setIsEditing(true)} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink" aria-label="Priorität bearbeiten"><Pencil className="h-4 w-4" /></button>
          )}
          <button
            type="button"
            onClick={() => {
              const confirmed = !linkedTasks.length || window.confirm(`${linkedTasks.length} Tagesaufgaben bleiben erhalten und werden entkoppelt. Priorität trotzdem löschen?`);
              if (confirmed) onDelete(priority.id);
            }}
            className="grid h-9 w-9 place-items-center rounded-lg text-subtle transition hover:bg-surface hover:text-ink"
            aria-label="Priorität löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

export default function WeeklyPriorities({ priorities, unassignedPriorities, tasks, monthlyGoals, allMonthlyGoals, selectedWeek, parentPrefill, onNavigateParent, onNavigateTask, onDeriveTask, onCreate, onAssign, onUpdate, onDelete }) {
  const [text, setText] = useState("");
  const [monthlyGoalId, setMonthlyGoalId] = useState(parentPrefill);
  const canAdd = priorities.length < 3;
  const weekMonthKeys = new Set([
    toMonthKey(selectedWeek),
    toMonthKey(addDays(selectedWeek, 6)),
  ]);
  const monthlyGoalById = new Map(allMonthlyGoals.map((goal) => [goal.id, goal]));
  const sortedUnassignedPriorities = [...unassignedPriorities].sort((left, right) => {
    const leftParentTitle = monthlyGoalById.get(left.monthlyGoalId)?.title ?? "";
    const rightParentTitle = monthlyGoalById.get(right.monthlyGoalId)?.title ?? "";
    return rightParentTitle.localeCompare(leftParentTitle, "de", { sensitivity: "base" });
  });

  useEffect(() => setMonthlyGoalId(parentPrefill), [parentPrefill]);

  function submit(event) {
    event.preventDefault();
    const nextText = text.trim();
    if (!nextText || !canAdd) return;
    onCreate({ text: nextText, monthlyGoalId });
    setText("");
    setMonthlyGoalId(null);
  }

  return (
    <div className="space-y-10">
      <form onSubmit={submit} className="bg-depth-panel rounded-panel p-5 shadow-card sm:p-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase text-subtle">Schnellerfassung</p>
            <p className="text-base font-black uppercase text-ink">Wochenpriorität hinzufügen</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </div>
        <div className="surface-divider grid gap-3 pb-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)_auto] lg:items-end">
          <label>
            <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Aufgabe</span>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={canAdd ? "z.B. Konzept abschließen" : "Maximal drei Prioritäten erreicht"}
              disabled={!canAdd}
              className="bg-depth-control min-h-12 w-full rounded-control px-4 text-sm text-ink shadow-inset outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <ParentSelect value={monthlyGoalId} onChange={setMonthlyGoalId} options={monthlyGoals} label="Monatspriorität verknüpfen" disabled={!canAdd} />
          <button
            type="submit"
            disabled={!canAdd || !text.trim()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-black text-accent-contrast shadow-inset transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Hinzufügen
          </button>
        </div>

        <div className="pt-5">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-muted" />
              <p className="text-xs font-black uppercase text-ink">Archiv</p>
            </div>
            <span className="text-[10px] font-bold uppercase text-subtle">
              {unassignedPriorities.length} unzugeordnet
            </span>
          </div>

          {unassignedPriorities.length ? (
            <ul className="space-y-2">
              {sortedUnassignedPriorities.map((priority) => {
                const parent = monthlyGoalById.get(priority.monthlyGoalId);
                const fitsSelectedWeek = !parent || weekMonthKeys.has(parent.periodKey);
                const canAssign = canAdd && fitsSelectedWeek;
                const unavailableReason = !canAdd
                  ? "Maximal drei Prioritäten für diese Woche erreicht"
                  : "Die verknüpfte Monatspriorität liegt außerhalb dieser Woche";

                return (
                  <li key={priority.id} className="flex flex-col gap-3 rounded-control bg-canvas-deep px-4 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{priority.text}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase text-subtle">
                        {parent?.title ?? "Nicht verknüpft"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAssign(priority.id)}
                      disabled={!canAssign}
                      title={canAssign ? "Dieser Woche hinzufügen" : unavailableReason}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-control bg-ink px-4 text-xs font-black text-inverse transition hover:bg-accent hover:text-accent-contrast disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`${priority.text} dieser Woche hinzufügen`}
                    >
                      <Plus className="h-4 w-4" />
                      Hinzufügen
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-2 text-sm text-subtle">Keine unzugeordneten Wochenprioritäten vorhanden.</p>
          )}
        </div>
      </form>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4 pb-2">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase text-subtle">Wochenfokus</p>
            <h2 className="text-2xl font-black uppercase text-ink">Wochenpriorität</h2>
          </div>
          <span className="bg-depth-control shrink-0 whitespace-nowrap rounded-control px-3 py-2 text-xs font-bold text-muted shadow-inset">
            {priorities.length} / 3
          </span>
        </div>

        {priorities.length ? (
          <ol className="space-y-3">
            {priorities.map((priority) => (
              <PriorityRow
                key={priority.id}
                priority={priority}
                parent={monthlyGoals.find((goal) => goal.id === priority.monthlyGoalId)}
                parentOptions={monthlyGoals}
                linkedTasks={tasks.filter((task) => task.weeklyPriorityId === priority.id)}
                onNavigateParent={onNavigateParent}
                onNavigateTask={onNavigateTask}
                onDeriveTask={onDeriveTask}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </ol>
        ) : (
          <div className="flat-dashed-frame flex min-h-44 items-center justify-center rounded-panel p-10 text-center text-sm text-muted sm:min-h-48 sm:p-12">
            Lege bis zu drei Prioritäten für diese Woche fest.
          </div>
        )}
      </section>
    </div>
  );
}
