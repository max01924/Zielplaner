import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import DayView from "./components/DayView.jsx";
import MonthlyView from "./components/MonthlyView.jsx";
import SyncButton from "./components/SyncButton.jsx";
import TabNav from "./components/TabNav.jsx";
import YearlyView from "./components/YearlyView.jsx";
import { toDateKey } from "./utils/date.js";
import { Moon, Sun } from "lucide-react";

const tabs = [
  { id: "daily", label: "Täglich" },
  { id: "monthly", label: "Monatlich" },
  { id: "yearly", label: "Jährlich" },
];

function updateGoalList(goals, goalId, updater) {
  return goals.map((goal) => (goal.id === goalId ? updater(goal) : goal));
}

function createGoalHandlers(period, setGoals, runMutation) {
  return {
    onCreateGoal(goal) {
      return runMutation(async () => {
        const createdGoal = await api.createGoal({ period, ...goal });
        setGoals((current) => [createdGoal, ...current]);
      });
    },
    onUpdateGoal(updatedGoal) {
      return runMutation(async () => {
        const savedGoal = await api.updateGoal(updatedGoal.id, {
          title: updatedGoal.title,
          description: updatedGoal.description,
        });
        setGoals((current) => current.map((goal) => (goal.id === savedGoal.id ? savedGoal : goal)));
      });
    },
    onDeleteGoal(goalId) {
      return runMutation(async () => {
        await api.deleteGoal(goalId);
        setGoals((current) => current.filter((goal) => goal.id !== goalId));
      });
    },
    onAddItem(goalId, text) {
      return runMutation(async () => {
        const createdItem = await api.createChecklistItem(goalId, text);
        setGoals((current) =>
          updateGoalList(current, goalId, (goal) => ({
            ...goal,
            checklist: [...goal.checklist, createdItem],
          }))
        );
      });
    },
    onUpdateItem(goalId, itemId, text) {
      return runMutation(async () => {
        const savedItem = await api.updateChecklistItem(itemId, { text });
        setGoals((current) =>
          updateGoalList(current, goalId, (goal) => ({
            ...goal,
            checklist: goal.checklist.map((item) => (item.id === itemId ? savedItem : item)),
          }))
        );
      });
    },
    onToggleItem(goalId, itemId, done) {
      return runMutation(async () => {
        const savedItem = await api.updateChecklistItem(itemId, { done });
        setGoals((current) =>
          updateGoalList(current, goalId, (goal) => ({
            ...goal,
            checklist: goal.checklist.map((item) => (item.id === itemId ? savedItem : item)),
          }))
        );
      });
    },
    onDeleteItem(goalId, itemId) {
      return runMutation(async () => {
        await api.deleteChecklistItem(itemId);
        setGoals((current) =>
          updateGoalList(current, goalId, (goal) => ({
            ...goal,
            checklist: goal.checklist.filter((item) => item.id !== itemId),
          }))
        );
      });
    },
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState("daily");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const storedMode = localStorage.getItem("zielplaner-theme");
    if (storedMode) {
      return storedMode === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [dailyTasks, setDailyTasks] = useState({});
  const [monthlyGoals, setMonthlyGoals] = useState([]);
  const [yearlyGoals, setYearlyGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedDateKey = toDateKey(selectedDate);
  const selectedTasks = dailyTasks[selectedDateKey] ?? [];

  const loadState = useCallback(async () => {
    const state = await api.getState();
    setDailyTasks(state.dailyTasks);
    setMonthlyGoals(state.monthlyGoals);
    setYearlyGoals(state.yearlyGoals);
    setError("");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("zielplaner-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;

    loadState()
      .then(() => {
        if (!isMounted) {
          return;
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loadState]);

  const runMutation = useCallback(async (mutation) => {
    try {
      setError("");
      await mutation();
    } catch (mutationError) {
      setError(mutationError.message);
    }
  }, []);

  const dailyHandlers = {
    onAddTask(task) {
      return runMutation(async () => {
        const createdTask = await api.createDailyTask({ dateKey: selectedDateKey, ...task });
        setDailyTasks((current) => ({
          ...current,
          [selectedDateKey]: [...(current[selectedDateKey] ?? []), createdTask],
        }));
      });
    },
    onToggleTask(taskId) {
      const task = selectedTasks.find((item) => item.id === taskId);
      if (!task) {
        return undefined;
      }

      return runMutation(async () => {
        const savedTask = await api.updateDailyTask(taskId, { done: !task.done });
        setDailyTasks((current) => ({
          ...current,
          [selectedDateKey]: (current[selectedDateKey] ?? []).map((item) =>
            item.id === taskId ? savedTask : item
          ),
        }));
      });
    },
    onUpdateTask(taskId, updatedTask) {
      return runMutation(async () => {
        const savedTask = await api.updateDailyTask(taskId, {
          time: updatedTask.time,
          text: updatedTask.text,
        });
        setDailyTasks((current) => ({
          ...current,
          [selectedDateKey]: (current[selectedDateKey] ?? []).map((task) =>
            task.id === taskId ? savedTask : task
          ),
        }));
      });
    },
    onDeleteTask(taskId) {
      return runMutation(async () => {
        await api.deleteDailyTask(taskId);
        setDailyTasks((current) => ({
          ...current,
          [selectedDateKey]: (current[selectedDateKey] ?? []).filter((task) => task.id !== taskId),
        }));
      });
    },
  };

  const monthlyHandlers = useMemo(
    () => createGoalHandlers("monthly", setMonthlyGoals, runMutation),
    [runMutation]
  );
  const yearlyHandlers = useMemo(
    () => createGoalHandlers("yearly", setYearlyGoals, runMutation),
    [runMutation]
  );

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 rounded-lg border border-slate-200 bg-white/90 p-5 text-center shadow-panel backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="mb-4 flex items-start justify-between gap-3">
            <SyncButton onSynced={loadState} />

            <button
              type="button"
              onClick={() => setIsDarkMode((current) => !current)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={isDarkMode ? "Lightmode aktivieren" : "Darkmode aktivieren"}
              title={isDarkMode ? "Lightmode" : "Darkmode"}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
            <h1 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
              Zielplaner
            </h1>
            <div className="w-full max-w-[420px]">
              <TabNav activeTab={activeTab} tabs={tabs} onChange={setActiveTab} />
            </div>
          </div>
          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}
        </header>

        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            Daten werden geladen...
          </div>
        ) : null}

        {!isLoading && activeTab === "daily" ? (
          <DayView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            tasks={selectedTasks}
            {...dailyHandlers}
          />
        ) : null}

        {!isLoading && activeTab === "monthly" ? (
          <MonthlyView goals={monthlyGoals} {...monthlyHandlers} />
        ) : null}

        {!isLoading && activeTab === "yearly" ? (
          <YearlyView goals={yearlyGoals} {...yearlyHandlers} />
        ) : null}
      </div>
    </main>
  );
}
