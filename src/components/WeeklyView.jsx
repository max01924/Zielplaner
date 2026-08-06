import { addWeeks, formatWeekRange, isoWeekNumber, startOfIsoWeek } from "../utils/date.js";
import { isCurrentPeriod, periodTimeProgress } from "../utils/periodProgress.js";
import PeriodHeader from "./PeriodHeader.jsx";
import WeeklyPriorities from "./WeeklyPriorities.jsx";
import WeeklyReview from "./WeeklyReview.jsx";
import WeeklyTasks from "./WeeklyTasks.jsx";

export default function WeeklyView({
  data,
  unassignedPriorities,
  allMonthlyGoals,
  selectedWeek,
  onWeekChange,
  parentPrefill,
  onNavigateParent,
  onNavigateTask,
  onDeriveTask,
  onCreatePriority,
  onAssignPriority,
  onUpdatePriority,
  onDeletePriority,
  onToggleTask,
  canReview,
  onSaveReview,
}) {
  const priorities = data?.priorities ?? [];
  const tasks = data?.tasks ?? [];
  const monthlyGoals = data?.monthlyGoals ?? [];
  const completedTasks = tasks.filter((task) => task.done).length;
  const timeProgress = periodTimeProgress("week", selectedWeek);

  return (
    <div className="space-y-10">
      <PeriodHeader
        meta={formatWeekRange(selectedWeek)}
        title={`Kalenderwoche ${isoWeekNumber(selectedWeek)}`}
        previousAriaLabel="Vorherige Woche"
        nextAriaLabel="Nächste Woche"
        progressLabel="Wochenfortschritt"
        isCurrent={isCurrentPeriod("week", selectedWeek)}
        onPrevious={() => onWeekChange(addWeeks(selectedWeek, -1))}
        onCurrent={() => onWeekChange(startOfIsoWeek(new Date()))}
        onNext={() => onWeekChange(addWeeks(selectedWeek, 1))}
        completedTasks={completedTasks}
        totalTasks={tasks.length}
        timeProgress={timeProgress}
      />

      <WeeklyPriorities
        priorities={priorities}
        unassignedPriorities={unassignedPriorities}
        tasks={tasks}
        monthlyGoals={monthlyGoals}
        allMonthlyGoals={allMonthlyGoals}
        selectedWeek={selectedWeek}
        parentPrefill={parentPrefill}
        onNavigateParent={onNavigateParent}
        onNavigateTask={onNavigateTask}
        onDeriveTask={onDeriveTask}
        onCreate={onCreatePriority}
        onAssign={onAssignPriority}
        onUpdate={onUpdatePriority}
        onDelete={onDeletePriority}
      />

      <WeeklyTasks tasks={tasks} onToggle={onToggleTask} onNavigate={onNavigateTask} />

      <WeeklyReview
        review={data?.review ?? null}
        canEdit={canReview}
        onSave={onSaveReview}
      />
    </div>
  );
}
