import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import DayView from "./components/DayView.jsx";
import HabitsView from "./components/HabitsView.jsx";
import MonthlyView from "./components/MonthlyView.jsx";
import SettingsDialog from "./components/SettingsDialog.jsx";
import SyncButton from "./components/SyncButton.jsx";
import TabNav from "./components/TabNav.jsx";
import WeeklyView from "./components/WeeklyView.jsx";
import YearlyView from "./components/YearlyView.jsx";
import { addDays, dateFromKey, startOfIsoWeek, toDateKey, toMonthKey } from "./utils/date.js";
import {
  loadBackgroundImage,
  optimizeBackgroundImage,
  removeBackgroundImage,
  storeBackgroundImage,
} from "./utils/backgroundImage.js";
import { canFillDailyReview, pendingDailyReviewDate } from "./utils/dailyReview.js";
import { canFillWeeklyReview, pendingWeeklyReviewWeek } from "./utils/weeklyReview.js";
import { reviewForPeriod } from "./utils/reviewQuestions.js";
import { applyAppearance, applyBackgroundImage, loadSettings, normalizeSettings, storeSettings } from "./utils/settings.js";
import { MessageSquareText, Repeat2, Settings, Target } from "lucide-react";

const modes = [
  { id: "goals", label: "Zielplaner", Icon: Target },
  { id: "habits", label: "Habits", Icon: Repeat2 },
];

const tabs = [
  { id: "daily", label: "Täglich", shortLabel: "Tag" },
  { id: "weekly", label: "Wöchentlich", shortLabel: "Woche" },
  { id: "monthly", label: "Monatlich", shortLabel: "Monat" },
  { id: "yearly", label: "Jährlich", shortLabel: "Jahr" },
];

function updateGoalList(goals, goalId, updater) {
  return goals.map((goal) => (goal.id === goalId ? updater(goal) : goal));
}

function createGoalHandlers(period, setGoals, runMutation, refreshState, onCreated) {
  return {
    onCreateGoal(goal) {
      return runMutation(async () => {
        const createdGoal = await api.createGoal({ period, ...goal });
        setGoals((current) => [createdGoal, ...current]);
        onCreated?.(createdGoal);
      });
    },
    onUpdateGoal(updatedGoal) {
      return runMutation(async () => {
        const savedGoal = await api.updateGoal(updatedGoal.id, {
          title: updatedGoal.title,
          description: updatedGoal.description,
          periodKey: updatedGoal.periodKey,
          parentGoalId: updatedGoal.parentGoalId,
        });
        setGoals((current) => current.map((goal) => (goal.id === savedGoal.id ? savedGoal : goal)));
      });
    },
    onDeleteGoal(goalId) {
      return runMutation(async () => {
        await api.deleteGoal(goalId);
        await refreshState();
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

function ModeToggle({ activeMode, onChange }) {
  return (
    <div className="bg-depth-inset grid w-full max-w-[390px] grid-cols-2 gap-1 rounded-panel p-1 shadow-inset">
      {modes.map(({ id, label, Icon }) => {
        const isActive = activeMode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[24px] px-4 text-xs font-black uppercase transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/70 sm:text-sm ${
              isActive
                ? "bg-accent text-accent-contrast shadow-inset"
                : "text-muted hover:bg-surface-hover hover:text-ink"
            }`}
            aria-pressed={isActive}
          >
            <Icon className={`h-5 w-5 ${isActive ? "text-ink" : ""}`} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [activeMode, setActiveMode] = useState(settings.startMode);
  const [activeTab, setActiveTab] = useState(settings.startTab);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backgroundImageBlob, setBackgroundImageBlob] = useState(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(null);
  const [planningDate, setPlanningDate] = useState(() => new Date());
  const [habitMonthDate, setHabitMonthDate] = useState(() => new Date());
  const [dailyTasks, setDailyTasks] = useState({});
  const [dailyReviews, setDailyReviews] = useState([]);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [monthlyGoals, setMonthlyGoals] = useState([]);
  const [yearlyGoals, setYearlyGoals] = useState([]);
  const [weeklyPriorities, setWeeklyPriorities] = useState([]);
  const [habits, setHabits] = useState([]);
  const [weeklyData, setWeeklyData] = useState(null);
  const [monthlyParentPrefill, setMonthlyParentPrefill] = useState(null);
  const [weeklyParentPrefill, setWeeklyParentPrefill] = useState(null);
  const [dailyParentPrefill, setDailyParentPrefill] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [reviewScrollRequest, setReviewScrollRequest] = useState(null);
  const [weeklyReviewScrollRequest, setWeeklyReviewScrollRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedDateKey = toDateKey(planningDate);
  const selectedTasks = dailyTasks[selectedDateKey] ?? [];
  const selectedReview = useMemo(
    () => reviewForPeriod(dailyReviews, selectedDateKey, "dateKey"),
    [dailyReviews, selectedDateKey]
  );
  const previousDateKey = toDateKey(addDays(planningDate, -1));
  const previousReview = dailyReviews.find((review) => review.dateKey === previousDateKey) ?? null;
  const carryOverTasks = selectedDateKey === toDateKey(now) && previousReview?.completedAt
    ? (dailyTasks[previousDateKey] ?? []).filter((task) => !task.done)
    : [];
  const pendingReviewDate = pendingDailyReviewDate(dailyReviews, now);
  const pendingWeeklyReviewKey = pendingWeeklyReviewWeek(weeklyReviews, now);
  const habitMonthKey = toMonthKey(habitMonthDate);
  const weekKey = toDateKey(startOfIsoWeek(planningDate));
  const selectedWeeklyReview = useMemo(
    () => reviewForPeriod(weeklyReviews, weekKey, "weekKey"),
    [weekKey, weeklyReviews]
  );
  const visibleWeeklyData = useMemo(
    () => ({ ...weeklyData, review: selectedWeeklyReview }),
    [selectedWeeklyReview, weeklyData]
  );
  const monthKey = toMonthKey(planningDate);
  const yearKey = String(planningDate.getFullYear());
  const visibleMonthlyGoals = monthlyGoals.filter((goal) => goal.periodKey === monthKey);
  const visibleYearlyGoals = yearlyGoals.filter((goal) => goal.periodKey === yearKey);
  const weekPriorities = weeklyPriorities.filter((priority) => priority.weekKey === weekKey);

  useEffect(() => {
    let isMounted = true;
    loadBackgroundImage()
      .then((blob) => {
        if (isMounted) setBackgroundImageBlob(blob);
      })
      .catch((backgroundError) => {
        console.warn("Hintergrundbild konnte nicht geladen werden:", backgroundError);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!backgroundImageBlob) {
      setBackgroundImageUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(backgroundImageBlob);
    setBackgroundImageUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [backgroundImageBlob]);

  useEffect(() => {
    applyAppearance(settings);
    applyBackgroundImage(settings, backgroundImageUrl);
  }, [backgroundImageUrl, settings]);

  const loadState = useCallback(async () => {
    const [state, habitState, weekState] = await Promise.all([
      api.getState(),
      api.getHabits(habitMonthKey),
      api.getWeek(weekKey),
    ]);
    setDailyTasks(state.dailyTasks);
    setDailyReviews(state.dailyReviews ?? []);
    setWeeklyReviews(state.weeklyReviews ?? []);
    setMonthlyGoals(state.monthlyGoals);
    setYearlyGoals(state.yearlyGoals);
    setWeeklyPriorities(state.weeklyPriorities ?? []);
    setHabits(habitState.habits ?? []);
    setWeeklyData(weekState);
    setError("");
  }, [habitMonthKey, weekKey]);

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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!reviewScrollRequest || isLoading || activeMode !== "goals" || activeTab !== "daily") {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      document.getElementById("daily-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setReviewScrollRequest(null);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [activeMode, activeTab, isLoading, planningDate, reviewScrollRequest]);

  useEffect(() => {
    if (!weeklyReviewScrollRequest || isLoading || activeMode !== "goals" || activeTab !== "weekly") {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      document.getElementById("weekly-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setWeeklyReviewScrollRequest(null);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [activeMode, activeTab, isLoading, planningDate, weeklyReviewScrollRequest]);

  useEffect(() => {
    if (monthlyParentPrefill && !yearlyGoals.some(
      (goal) => goal.id === monthlyParentPrefill && goal.periodKey === yearKey
    )) {
      setMonthlyParentPrefill(null);
    }
    if (weeklyParentPrefill && weeklyData && !weeklyData.monthlyGoals.some(
      (goal) => goal.id === weeklyParentPrefill
    )) {
      setWeeklyParentPrefill(null);
    }
    if (dailyParentPrefill && !weekPriorities.some(
      (priority) => priority.id === dailyParentPrefill
    )) {
      setDailyParentPrefill(null);
    }
  }, [dailyParentPrefill, monthKey, monthlyParentPrefill, weekKey, weekPriorities, weeklyData, weeklyParentPrefill, yearKey, yearlyGoals]);

  const runMutation = useCallback(async (mutation) => {
    try {
      setError("");
      return await mutation();
    } catch (mutationError) {
      setError(mutationError.message);
      return false;
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
        setDailyParentPrefill(null);
      });
    },
    onCarryOverPreviousTasks() {
      return runMutation(async () => {
        const result = await api.carryOverDailyTasks(previousDateKey, selectedDateKey);
        const movedTasks = result.tasks ?? [];
        const movedIds = new Set(movedTasks.map((task) => task.id));
        setDailyTasks((current) => ({
          ...current,
          [previousDateKey]: (current[previousDateKey] ?? []).filter((task) => !movedIds.has(task.id)),
          [selectedDateKey]: [
            ...(current[selectedDateKey] ?? []).filter((task) => !movedIds.has(task.id)),
            ...movedTasks,
          ],
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
    onToggleFocus(taskId) {
      const task = selectedTasks.find((item) => item.id === taskId);
      if (!task) {
        return undefined;
      }

      return runMutation(async () => {
        const savedTask = await api.updateDailyTask(taskId, {
          isDailyFocus: !task.isDailyFocus,
        });
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
          dateKey: updatedTask.dateKey,
          time: updatedTask.time,
          text: updatedTask.text,
          weeklyPriorityId: updatedTask.weeklyPriorityId,
        });
        setDailyTasks((current) => {
          const sourceDateKey = Object.keys(current).find((dateKey) =>
            (current[dateKey] ?? []).some((task) => task.id === taskId)
          ) ?? selectedDateKey;
          const next = {
            ...current,
            [sourceDateKey]: (current[sourceDateKey] ?? []).filter((task) => task.id !== taskId),
          };
          const targetTasks = savedTask.dateKey === sourceDateKey
            ? next[sourceDateKey]
            : (current[savedTask.dateKey] ?? []);
          next[savedTask.dateKey] = [
            ...targetTasks.filter((task) => task.id !== taskId),
            savedTask,
          ];
          return next;
        });
        return true;
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
    onSaveReview(review) {
      return runMutation(async () => {
        const savedReview = await api.saveDailyReview(selectedDateKey, review);
        setDailyReviews((current) => [
          savedReview,
          ...current.filter((item) => item.dateKey !== savedReview.dateKey),
        ]);
      });
    },
  };

  const monthlyHandlers = useMemo(
    () => createGoalHandlers(
      "monthly",
      setMonthlyGoals,
      runMutation,
      loadState,
      () => setMonthlyParentPrefill(null)
    ),
    [loadState, runMutation]
  );
  const yearlyHandlers = useMemo(
    () => createGoalHandlers("yearly", setYearlyGoals, runMutation, loadState),
    [loadState, runMutation]
  );

  function toggleMonthlyWeeklyPriority(priority) {
    return runMutation(async () => {
      const savedPriority = await api.updateWeeklyPriority(priority.id, {
        done: !priority.done,
      });
      setWeeklyPriorities((current) => current.map((item) => (
        item.id === savedPriority.id ? savedPriority : item
      )));
      setWeeklyData((current) => current ? {
        ...current,
        priorities: (current.priorities ?? []).map((item) => (
          item.id === savedPriority.id ? savedPriority : item
        )),
      } : current);
    });
  }

  function createMonthlyWeeklyPriority(goalId, draft) {
    return runMutation(async () => {
      const priority = await api.createMonthlyWeeklyPriority(goalId, draft);
      setWeeklyPriorities((current) => [...current, priority]);
      if (priority.weekKey === weekKey) {
        setWeeklyData((current) => current ? {
          ...current,
          priorities: [...(current.priorities ?? []), priority],
        } : current);
      }
    });
  }

  function updateMonthlyWeeklyPriority(priorityId, patch) {
    return runMutation(async () => {
      await api.updateWeeklyPriority(priorityId, patch);
      await loadState();
      return true;
    });
  }

  function deleteMonthlyWeeklyPriority(priorityId) {
    return runMutation(async () => {
      await api.deleteWeeklyPriority(priorityId);
      await loadState();
    });
  }

  useEffect(() => {
    if (activeMode !== "goals" || activeTab !== "weekly" || isLoading) {
      return;
    }
    api.getWeek(weekKey).then(setWeeklyData).catch((loadError) => setError(loadError.message));
  }, [activeMode, activeTab, isLoading, weekKey]);

  const weeklyHandlers = {
    onCreatePriority(priorityDraft) {
      return runMutation(async () => {
        const priority = await api.createWeeklyPriority(weekKey, priorityDraft);
        setWeeklyData((current) => ({
          ...current,
          priorities: [...(current?.priorities ?? []), priority],
        }));
        setWeeklyPriorities((current) => [...current, priority]);
        setWeeklyParentPrefill(null);
      });
    },
    onUpdatePriority(priorityId, patch) {
      return runMutation(async () => {
        const priority = await api.updateWeeklyPriority(priorityId, patch);
        setWeeklyData((current) => ({
          ...current,
          priorities: (current?.priorities ?? []).map((item) =>
            item.id === priorityId ? priority : item
          ),
        }));
        setWeeklyPriorities((current) => current.map((item) =>
          item.id === priorityId ? priority : item
        ));
      });
    },
    onDeletePriority(priorityId) {
      return runMutation(async () => {
        await api.deleteWeeklyPriority(priorityId);
        await loadState();
      });
    },
    onAssignPriority(priorityId) {
      return runMutation(async () => {
        const priority = await api.updateWeeklyPriority(priorityId, { weekKey });
        await loadState();
        return priority;
      });
    },
    onToggleTask(task) {
      return runMutation(async () => {
        const savedTask = await api.updateDailyTask(task.id, { done: !task.done });
        setDailyTasks((current) => ({
          ...current,
          [task.dateKey]: (current[task.dateKey] ?? []).map((item) =>
            item.id === task.id ? savedTask : item
          ),
        }));
        setWeeklyData((current) => ({
          ...current,
          tasks: (current?.tasks ?? []).map((item) =>
            item.id === task.id ? savedTask : item
          ),
          previousWeekOpenTasks: (current?.previousWeekOpenTasks ?? []).filter(
            (item) => item.id !== task.id
          ),
        }));
      });
    },
    onSaveReview(review) {
      return runMutation(async () => {
        const savedReview = await api.saveWeeklyReview(weekKey, review);
        setWeeklyData((current) => ({ ...current, review: savedReview }));
        setWeeklyReviews((current) => [
          savedReview,
          ...current.filter((item) => item.weekKey !== savedReview.weekKey),
        ]);
      });
    },
  };

  function openMonthlyParent(goal) {
    setPlanningDate(dateFromKey(`${goal.periodKey}-01`));
    setActiveTab("monthly");
  }

  function openYearlyParent(goal) {
    setPlanningDate(dateFromKey(`${goal.periodKey}-01-01`));
    setActiveTab("yearly");
  }

  function openWeeklyParent(priority) {
    setPlanningDate(dateFromKey(priority.weekKey));
    setActiveTab("weekly");
  }

  function openDailyChild(task) {
    setPlanningDate(dateFromKey(task.dateKey));
    setActiveTab("daily");
  }

  function changePlanningTab(tab) {
    setMonthlyParentPrefill(null);
    setWeeklyParentPrefill(null);
    setDailyParentPrefill(null);
    setActiveTab(tab);
  }

  function openPendingDailyReview() {
    if (!pendingReviewDate) return;
    setActiveMode("goals");
    setActiveTab("daily");
    setPlanningDate(dateFromKey(pendingReviewDate));
    setReviewScrollRequest(pendingReviewDate);
  }

  function openPendingWeeklyReview() {
    if (!pendingWeeklyReviewKey) return;
    setActiveMode("goals");
    setActiveTab("weekly");
    setPlanningDate(dateFromKey(pendingWeeklyReviewKey));
    setWeeklyReviewScrollRequest(pendingWeeklyReviewKey);
  }

  function deriveMonthlyGoal(yearlyGoal) {
    const now = new Date();
    const target = String(now.getFullYear()) === yearlyGoal.periodKey
      ? now
      : dateFromKey(`${yearlyGoal.periodKey}-01-01`);
    setPlanningDate(target);
    setMonthlyParentPrefill(yearlyGoal.id);
    setActiveTab("monthly");
  }

  function deriveDailyTask(priority) {
    const now = new Date();
    const currentWeekKey = toDateKey(startOfIsoWeek(now));
    setPlanningDate(currentWeekKey === priority.weekKey ? now : dateFromKey(priority.weekKey));
    setDailyParentPrefill(priority.id);
    setActiveTab("daily");
  }

  async function saveSettings(nextSettings, backgroundChange = {}) {
    let nextBackgroundBlob = backgroundImageBlob;
    if (backgroundChange.file) {
      nextBackgroundBlob = await optimizeBackgroundImage(backgroundChange.file);
      await storeBackgroundImage(nextBackgroundBlob);
    } else if (backgroundChange.remove) {
      await removeBackgroundImage();
      nextBackgroundBlob = null;
    }

    const normalizedSettings = normalizeSettings(nextSettings);
    if (normalizedSettings.backgroundMode === "custom" && !nextBackgroundBlob) {
      throw new Error("Bitte zuerst ein Hintergrundbild auswählen.");
    }

    const savedSettings = storeSettings(normalizedSettings);
    setBackgroundImageBlob(nextBackgroundBlob);
    setSettings(savedSettings);
    setSettingsOpen(false);
    return true;
  }

  const habitHandlers = {
    onCreateHabit(habit) {
      return runMutation(async () => {
        const createdHabit = await api.createHabit(habit);
        setHabits((current) => [createdHabit, ...current]);
      });
    },
    onUpdateHabit(habitId, patch) {
      return runMutation(async () => {
        const savedHabit = await api.updateHabit(habitId, patch);
        setHabits((current) =>
          current.map((habit) => (habit.id === habitId ? savedHabit : habit))
        );
      });
    },
    onDeleteHabit(habitId) {
      return runMutation(async () => {
        await api.deleteHabit(habitId);
        setHabits((current) => current.filter((habit) => habit.id !== habitId));
      });
    },
    onToggleHabit(habitId, date) {
      return runMutation(async () => {
        const savedHabit = await api.toggleHabitCompletion(habitId, date);
        setHabits((current) =>
          current.map((habit) => (habit.id === habitId ? savedHabit : habit))
        );
      });
    },
  };

  return (
    <>
      <div className="custom-background-layer" aria-hidden="true" />
      <main className="relative z-10 min-h-screen px-4 py-5 text-ink sm:px-6 sm:py-7 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-7xl">
        <header className="mb-10">
          <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
            <div className="flex items-center gap-3 lg:justify-self-start">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="bg-depth-inset grid h-10 w-10 shrink-0 place-items-center rounded-control text-muted shadow-inset transition hover:text-ink hover:brightness-125"
                aria-label="Einstellungen öffnen"
                title="Einstellungen"
              >
                <Settings className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3" aria-label="Zielplaner">
                <span className="h-10 w-1 rounded-full bg-accent shadow-[0_0_24px_rgb(var(--color-accent-rgb)/0.35)]" />
                <div>
                  <p className="text-sm font-black uppercase text-ink">Zielplaner</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase text-subtle">Planungssystem</p>
                </div>
              </div>
            </div>

            <div className="flex justify-start lg:justify-center">
              <ModeToggle activeMode={activeMode} onChange={setActiveMode} />
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end lg:justify-self-end">
              {!isLoading && pendingReviewDate ? (
                <button
                  type="button"
                  onClick={openPendingDailyReview}
                  className="daily-review-notice inline-flex min-h-11 max-w-[240px] items-center gap-2 rounded-control px-4 text-left text-xs font-black text-ink transition hover:brightness-125"
                >
                  <MessageSquareText className="h-4 w-4 shrink-0 text-accent" />
                  Tagesreview kann ausgefüllt werden
                </button>
              ) : null}
              {!isLoading && pendingWeeklyReviewKey ? (
                <button
                  type="button"
                  onClick={openPendingWeeklyReview}
                  className="daily-review-notice inline-flex min-h-11 max-w-[240px] items-center gap-2 rounded-control px-4 text-left text-xs font-black text-ink transition hover:brightness-125"
                >
                  <MessageSquareText className="h-4 w-4 shrink-0 text-accent" />
                  Wochenreview kann ausgefüllt werden
                </button>
              ) : null}
              <SyncButton onSynced={loadState} />
            </div>
          </div>

          {activeMode === "goals" ? (
            <div className="mt-6 flex justify-start lg:justify-center">
              <TabNav activeTab={activeTab} tabs={tabs} onChange={changePlanningTab} />
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 max-w-xl rounded-control bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast shadow-card">
              {error}
            </div>
          ) : null}
        </header>

        {isLoading ? (
          <div className="bg-depth-panel rounded-panel p-10 text-center text-sm font-semibold text-muted shadow-card">
            Daten werden geladen...
          </div>
        ) : null}

        {!isLoading && activeMode === "goals" && activeTab === "daily" ? (
          <DayView
            selectedDate={planningDate}
            onDateChange={setPlanningDate}
            tasks={selectedTasks}
            review={selectedReview}
            canReview={canFillDailyReview(selectedDateKey, now)}
            priorities={weekPriorities}
            parentPrefill={dailyParentPrefill}
            carryOverCount={carryOverTasks.length}
            onNavigateParent={openWeeklyParent}
            {...dailyHandlers}
          />
        ) : null}

        {!isLoading && activeMode === "goals" && activeTab === "monthly" ? (
          <MonthlyView
            goals={visibleMonthlyGoals}
            yearlyGoals={yearlyGoals.filter((goal) => goal.periodKey === yearKey)}
            weeklyPriorities={weeklyPriorities}
            selectedDate={planningDate}
            onDateChange={setPlanningDate}
            parentPrefill={monthlyParentPrefill}
            onNavigateParent={openYearlyParent}
            onNavigateChild={openWeeklyParent}
            onCreateWeeklyPriority={createMonthlyWeeklyPriority}
            onToggleWeeklyPriority={toggleMonthlyWeeklyPriority}
            onUpdateWeeklyPriority={updateMonthlyWeeklyPriority}
            onDeleteWeeklyPriority={deleteMonthlyWeeklyPriority}
            {...monthlyHandlers}
          />
        ) : null}

        {!isLoading && activeMode === "goals" && activeTab === "weekly" ? (
          <WeeklyView
            data={visibleWeeklyData}
            unassignedPriorities={weeklyPriorities.filter((priority) => !priority.weekKey)}
            allMonthlyGoals={monthlyGoals}
            selectedWeek={startOfIsoWeek(planningDate)}
            onWeekChange={setPlanningDate}
            parentPrefill={weeklyParentPrefill}
            onNavigateParent={openMonthlyParent}
            onNavigateTask={openDailyChild}
            onDeriveTask={deriveDailyTask}
            canReview={canFillWeeklyReview(weekKey, now)}
            {...weeklyHandlers}
          />
        ) : null}

        {!isLoading && activeMode === "goals" && activeTab === "yearly" ? (
          <YearlyView
            goals={visibleYearlyGoals}
            monthlyGoals={monthlyGoals}
            selectedDate={planningDate}
            onDateChange={setPlanningDate}
            onNavigateChild={openMonthlyParent}
            onDeriveChild={deriveMonthlyGoal}
            {...yearlyHandlers}
          />
        ) : null}

        {!isLoading && activeMode === "habits" ? (
          <HabitsView
            habits={habits}
            monthDate={habitMonthDate}
            onMonthChange={setHabitMonthDate}
            {...habitHandlers}
          />
        ) : null}

        {settingsOpen ? (
          <SettingsDialog
            settings={settings}
            backgroundImageUrl={backgroundImageUrl}
            onSave={saveSettings}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
        </div>
      </main>
    </>
  );
}
