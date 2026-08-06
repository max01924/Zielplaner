import { addMonths, formatMonthName, toMonthKey } from "../utils/date.js";
import { isCurrentPeriod, periodTimeProgress } from "../utils/periodProgress.js";
import { clampPercent } from "../utils/progress.js";
import GoalCard from "./GoalCard.jsx";
import GoalForm from "./GoalForm.jsx";
import DecorativeAccent from "./DecorativeAccent.jsx";
import PeriodHeader from "./PeriodHeader.jsx";

function compareWeeklyPriorities(left, right) {
  if (!left.weekKey && !right.weekKey) {
    return left.text.localeCompare(right.text, "de");
  }
  if (!left.weekKey) return 1;
  if (!right.weekKey) return -1;
  return right.weekKey.localeCompare(left.weekKey) || left.text.localeCompare(right.text, "de");
}

export default function MonthlyView({ goals, yearlyGoals, weeklyPriorities, selectedDate, onDateChange, parentPrefill, onNavigateParent, onNavigateChild, onCreateWeeklyPriority, onToggleWeeklyPriority, onUpdateWeeklyPriority, onDeleteWeeklyPriority, onCreateGoal, onUpdateGoal, onDeleteGoal }) {
  const periodKey = toMonthKey(selectedDate);
  const goalIds = new Set(goals.map((goal) => goal.id));
  const monthPriorities = weeklyPriorities.filter((priority) => goalIds.has(priority.monthlyGoalId));
  const completedTasks = monthPriorities.filter((priority) => priority.done).length;
  const timeProgress = periodTimeProgress("month", selectedDate);

  return (
    <section className="space-y-10">
      <PeriodHeader
        meta={`Monat ${String(selectedDate.getMonth() + 1).padStart(2, "0")} · ${selectedDate.getFullYear()}`}
        title={formatMonthName(selectedDate)}
        previousAriaLabel="Vorheriger Monat"
        nextAriaLabel="Nächster Monat"
        progressLabel="Monatsfortschritt"
        isCurrent={isCurrentPeriod("month", selectedDate)}
        onPrevious={() => onDateChange(addMonths(selectedDate, -1))}
        onCurrent={() => onDateChange(new Date())}
        onNext={() => onDateChange(addMonths(selectedDate, 1))}
        completedTasks={completedTasks}
        totalTasks={monthPriorities.length}
        timeProgress={timeProgress}
      />

      <GoalForm
        label="Monatspriorität hinzufügen"
        placeholder="z.B. NexusFalcon fertig"
        periodKey={periodKey}
        parentOptions={yearlyGoals}
        parentPrefill={parentPrefill}
        parentLabel="Jahresziel verknüpfen"
        quickCapture
        onCreate={onCreateGoal}
      />

      <div>
        <div className="relative mb-5 flex items-end justify-between gap-4 pb-4">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase text-subtle">Fokus</p>
            <h2 className="text-2xl font-black uppercase text-ink">Monatspriorität</h2>
          </div>
          <DecorativeAccent
            shape="diamond"
            size={14}
            className="right-[78px] top-2 hidden sm:block"
          />
          <span className="text-xs font-bold uppercase text-muted">
            {goals.length} {goals.length === 1 ? "Priorität" : "Prioritäten"}
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
          {goals.map((goal) => {
            const children = weeklyPriorities
              .filter((priority) => priority.monthlyGoalId === goal.id)
              .sort(compareWeeklyPriorities);
            const completedChildren = children.filter((priority) => priority.done).length;

            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                periodLabel="Monatspriorität"
                parentGoal={yearlyGoals.find((parent) => parent.id === goal.parentGoalId)}
                parentOptions={yearlyGoals}
                children={children}
                childLabel="Wochenprioritäten"
                implementationValue={children.length ? clampPercent((completedChildren / children.length) * 100) : 0}
                onNavigateParent={onNavigateParent}
                onNavigateChild={onNavigateChild}
                onAddChild={onCreateWeeklyPriority}
                onToggleChild={onToggleWeeklyPriority}
                onUpdateChild={onUpdateWeeklyPriority}
                onDeleteChild={onDeleteWeeklyPriority}
                onUpdateGoal={onUpdateGoal}
                onDeleteGoal={onDeleteGoal}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
