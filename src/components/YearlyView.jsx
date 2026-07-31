import { dayOfYear } from "../utils/date.js";
import { clampPercent } from "../utils/progress.js";
import GoalCard from "./GoalCard.jsx";
import GoalForm from "./GoalForm.jsx";
import ProgressBar from "./ProgressBar.jsx";

function yearProgress(date) {
  return clampPercent((dayOfYear(date) / 365) * 100);
}

export default function YearlyView({ goals, onCreateGoal, onUpdateGoal, onDeleteGoal, onAddItem, onUpdateItem, onToggleItem, onDeleteItem }) {
  const now = new Date();
  const progress = yearProgress(now);

  return (
    <section className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Jährlich</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{now.getFullYear()}</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Jahresziele bleiben bewusst breiter formuliert und haben eigene Checklisten.
          </p>
        </div>
        <ProgressBar
          label="Jahresfortschritt"
          value={progress}
          meta={`${dayOfYear(now)} von 365 Tagen vergangen`}
        />
      </div>

      <GoalForm
        label="Neues Jahresziel"
        placeholder="z.B. Ein großes Projekt präsentierfähig machen"
        onCreate={onCreateGoal}
      />

      <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/25">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950 dark:text-emerald-50">Jahresaufgaben</h2>
          <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
            {goals.length} Ziele
          </span>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              periodLabel="Jahresziel"
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
