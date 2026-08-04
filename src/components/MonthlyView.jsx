import { addMonths, formatMonthName, toMonthKey } from "../utils/date.js";
import { isCurrentPeriod, periodTimeProgress } from "../utils/periodProgress.js";
import { clampPercent } from "../utils/progress.js";
import GoalCard from "./GoalCard.jsx";
import GoalForm from "./GoalForm.jsx";
import DecorativeAccent from "./DecorativeAccent.jsx";
import PeriodHeader from "./PeriodHeader.jsx";

export default function MonthlyView({ goals, yearlyGoals, weeklyPriorities, selectedDate, onDateChange, parentPrefill, onNavigateParent, onNavigateChild, onDeriveChild, onCreateGoal, onUpdateGoal, onDeleteGoal, onAddItem, onUpdateItem, onToggleItem, onDeleteItem }) {
  const periodKey = toMonthKey(selectedDate);
  const checklistItems = goals.flatMap((goal) => goal.checklist);
  const completedTasks = checklistItems.filter((item) => item.done).length;
  const timeProgress = periodTimeProgress("month", selectedDate);

  return (
    <section className="space-y-7">
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
        totalTasks={checklistItems.length}
        timeProgress={timeProgress}
      />

      <GoalForm
        label="Neues Monatsziel"
        placeholder="z.B. NexusFalcon fertig"
        periodKey={periodKey}
        parentOptions={yearlyGoals}
        parentPrefill={parentPrefill}
        onCreate={onCreateGoal}
      />

      <div>
        <div className="relative mb-5 flex items-end justify-between gap-4 pb-4">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase text-subtle">Fokus</p>
            <h2 className="text-2xl font-black uppercase text-ink">Monatsaufgaben</h2>
          </div>
          <DecorativeAccent
            shape="diamond"
            size={14}
            className="right-[78px] top-2 hidden sm:block"
          />
          <span className="text-xs font-bold uppercase text-muted">
            {goals.length} Ziele
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              periodLabel="Monatsziel"
              parentGoal={yearlyGoals.find((parent) => parent.id === goal.parentGoalId)}
              parentOptions={yearlyGoals}
              children={weeklyPriorities.filter((priority) => priority.monthlyGoalId === goal.id)}
              childLabel="Wochenprioritäten"
              implementationValue={(() => {
                const children = weeklyPriorities.filter((priority) => priority.monthlyGoalId === goal.id);
                return children.length ? clampPercent((children.filter((priority) => priority.done).length / children.length) * 100) : 0;
              })()}
              onNavigateParent={onNavigateParent}
              onNavigateChild={onNavigateChild}
              onDeriveChild={onDeriveChild}
              onUpdateGoal={onUpdateGoal}
              onDeleteGoal={onDeleteGoal}
              onAddItem={onAddItem}
              onUpdateItem={onUpdateItem}
              onToggleItem={onToggleItem}
              onDeleteItem={onDeleteItem}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
