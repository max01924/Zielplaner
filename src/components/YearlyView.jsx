import { addYears } from "../utils/date.js";
import { isCurrentPeriod, periodTimeProgress } from "../utils/periodProgress.js";
import { checklistProgress, clampPercent } from "../utils/progress.js";
import GoalCard from "./GoalCard.jsx";
import GoalForm from "./GoalForm.jsx";
import DecorativeAccent from "./DecorativeAccent.jsx";
import PeriodHeader from "./PeriodHeader.jsx";

function chatGptMomentLabel(year) {
  const difference = year - 2022;
  if (difference === 0) return "ChatGPT-Moment";
  const years = Math.abs(difference);
  return `${years} ${years === 1 ? "Jahr" : "Jahre"} ${difference > 0 ? "seit" : "vor"} ChatGPT-Moment`;
}

export default function YearlyView({ goals, monthlyGoals, selectedDate, onDateChange, onNavigateChild, onDeriveChild, onCreateGoal, onUpdateGoal, onDeleteGoal, onAddItem, onUpdateItem, onToggleItem, onDeleteItem }) {
  const periodKey = String(selectedDate.getFullYear());
  const checklistItems = goals.flatMap((goal) => goal.checklist);
  const completedTasks = checklistItems.filter((item) => item.done).length;
  const timeProgress = periodTimeProgress("year", selectedDate);

  return (
    <section className="space-y-7">
      <PeriodHeader
        meta={chatGptMomentLabel(selectedDate.getFullYear())}
        title={periodKey}
        previousAriaLabel="Vorheriges Jahr"
        nextAriaLabel="Nächstes Jahr"
        progressLabel="Jahresfortschritt"
        isCurrent={isCurrentPeriod("year", selectedDate)}
        onPrevious={() => onDateChange(addYears(selectedDate, -1))}
        onCurrent={() => onDateChange(new Date())}
        onNext={() => onDateChange(addYears(selectedDate, 1))}
        completedTasks={completedTasks}
        totalTasks={checklistItems.length}
        timeProgress={timeProgress}
      />

      <GoalForm
        label="Neues Jahresziel"
        placeholder="z.B. Ein großes Projekt präsentierfähig machen"
        periodKey={periodKey}
        onCreate={onCreateGoal}
      />

      <div>
        <div className="relative mb-5 flex items-end justify-between gap-4 pb-4">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase text-subtle">Richtung</p>
            <h2 className="text-2xl font-black uppercase text-ink">Jahresaufgaben</h2>
          </div>
          <DecorativeAccent
            shape="star"
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
              periodLabel="Jahresziel"
              children={monthlyGoals.filter((child) => child.parentGoalId === goal.id)}
              childLabel="Monatsprioritäten"
              implementationValue={(() => {
                const children = monthlyGoals.filter((child) => child.parentGoalId === goal.id);
                return children.length
                  ? clampPercent(children.reduce((sum, child) => sum + checklistProgress(child.checklist), 0) / children.length)
                  : 0;
              })()}
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
