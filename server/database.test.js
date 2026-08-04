import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const testDirectory = mkdtempSync(join(tmpdir(), "zielplaner-hierarchy-"));
const databasePath = join(testDirectory, "goals.db");

const legacyDatabase = new DatabaseSync(databasePath);
legacyDatabase.exec(`
  CREATE TABLE daily_tasks (
    id TEXT PRIMARY KEY,
    date_key TEXT NOT NULL,
    time TEXT NOT NULL,
    text TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  INSERT INTO daily_tasks (id, date_key, time, text, done)
  VALUES ('legacy-task', '2027-01-04', '08:45', 'Legacy task', 0);
`);
legacyDatabase.close();

process.env.DATABASE_PATH = databasePath;
const database = await import(`./database.js?test=${Date.now()}`);

function findTask(id) {
  return Object.values(database.getState().dailyTasks).flat().find((task) => task.id === id);
}

test("migrates existing rows without changing their content", () => {
  const task = findTask("legacy-task");
  assert.equal(task.text, "Legacy task");
  assert.equal(task.time, "08:45");
  assert.equal(task.weeklyPriorityId, null);
  assert.equal(task.isDailyFocus, false);
});

test("creates and validates the full goal hierarchy", () => {
  const yearly = database.createGoal({
    period: "yearly",
    periodKey: "2027",
    title: "Year direction",
    description: "Keep this description",
  });
  const monthly = database.createGoal({
    period: "monthly",
    periodKey: "2027-01",
    title: "January outcome",
    description: "Monthly description",
    parentGoalId: yearly.id,
  });
  const priority = database.createWeeklyPriority({
    weekKey: "2027-01-04",
    text: "Weekly result",
    monthlyGoalId: monthly.id,
  });
  const task = database.createDailyTask({
    dateKey: "2027-01-05",
    time: "10:15",
    text: "Concrete action",
    weeklyPriorityId: priority.id,
    isDailyFocus: true,
  });

  assert.equal(monthly.parentGoalId, yearly.id);
  assert.equal(priority.monthlyGoalId, monthly.id);
  assert.equal(task.weeklyPriorityId, priority.id);
  assert.equal(task.isDailyFocus, true);

  const exported = database.exportGoalsForSync();
  assert.equal(exported.daily.find((entry) => entry.id === task.id).time, "10:15");
  assert.equal(exported.daily.find((entry) => entry.id === task.id).weekly_priority_id, priority.id);
  assert.equal(exported.daily.find((entry) => entry.id === task.id).is_daily_focus, true);
  assert.ok(exported.daily.find((entry) => entry.id === task.id).created_at);
  assert.equal(exported.monthly.find((entry) => entry.id === monthly.id).description, "Monthly description");
  assert.equal(exported.monthly.find((entry) => entry.id === monthly.id).yearly_goal_id, yearly.id);
  assert.ok(exported.monthly.find((entry) => entry.id === monthly.id).created_at);

  assert.throws(
    () => database.createGoal({
      period: "monthly",
      periodKey: "2028-01",
      title: "Wrong year",
      parentGoalId: yearly.id,
    }),
    (error) => error.status === 400
  );
  assert.throws(
    () => database.createWeeklyPriority({
      weekKey: "2027-02-08",
      text: "Wrong month",
      monthlyGoalId: monthly.id,
    }),
    (error) => error.status === 400
  );
  assert.throws(
    () => database.createDailyTask({
      dateKey: "2027-01-12",
      time: "11:00",
      text: "Wrong week",
      weeklyPriorityId: priority.id,
    }),
    (error) => error.status === 400
  );
});

test("daily focus survives sync and old files do not clear it", () => {
  const task = database.createDailyTask({
    dateKey: "2027-05-10",
    time: "09:30",
    text: "Focused work",
    isDailyFocus: true,
  });

  database.importGoalsFromSync({
    daily: [{
      id: task.id,
      date: task.dateKey,
      time: task.time,
      text: task.text,
      done: false,
      updated_at: "2090-02-01T00:00:00.000Z",
    }],
  });
  assert.equal(findTask(task.id).isDailyFocus, true);

  database.importGoalsFromSync({
    daily: [{
      id: task.id,
      date: task.dateKey,
      time: task.time,
      text: task.text,
      done: false,
      is_daily_focus: false,
      updated_at: "2090-02-02T00:00:00.000Z",
    }],
  });
  assert.equal(findTask(task.id).isDailyFocus, false);
});

test("tasks without a time stay in the daily backlog until scheduled", () => {
  const task = database.createDailyTask({
    dateKey: "2027-05-11",
    time: "",
    text: "Unscheduled task",
  });

  assert.equal(task.time, "");
  assert.equal(
    database.exportGoalsForSync().daily.find((entry) => entry.id === task.id).time,
    ""
  );

  database.importGoalsFromSync({
    daily: [{
      id: task.id,
      date: task.dateKey,
      time: "",
      text: task.text,
      done: false,
      updated_at: "2090-03-01T00:00:00.000Z",
    }],
  });
  assert.equal(findTask(task.id).time, "");

  const scheduled = database.updateDailyTask(task.id, { time: "13:45" });
  assert.equal(scheduled.time, "13:45");

  const returnedToBacklog = database.updateDailyTask(task.id, { time: "" });
  assert.equal(returnedToBacklog.time, "");
});

test("daily reviews keep drafts, custom questions and completion state in sync", () => {
  const draft = database.saveDailyReview({
    dateKey: "2027-05-11",
    positive: "Focused block",
    improvement: "Fewer interruptions",
    customQuestions: [{ id: "energy", question: "Energy?", answer: "Good" }],
  });
  assert.equal(draft.completedAt, null);
  assert.equal(draft.customQuestions[0].answer, "Good");

  const completed = database.saveDailyReview({
    dateKey: "2027-05-11",
    positive: draft.positive,
    improvement: draft.improvement,
    customQuestions: draft.customQuestions,
    complete: true,
  });
  assert.ok(completed.completedAt);

  const reopened = database.saveDailyReview({
    dateKey: "2027-05-11",
    positive: completed.positive,
    improvement: completed.improvement,
    customQuestions: completed.customQuestions,
    complete: false,
  });
  assert.equal(reopened.completedAt, null);

  const exported = database.exportGoalsForSync().daily_reviews.find(
    (review) => review.date === "2027-05-11"
  );
  assert.equal(exported.positive, "Focused block");
  assert.equal(exported.custom_questions[0].question, "Energy?");
  assert.equal(exported.completed_at, null);

  database.importGoalsFromSync({
    daily_reviews: [{
      date: "2035-01-02",
      positive: "Imported positive",
      improvement: "Imported improvement",
      custom_questions: [],
      completed_at: null,
      updated_at: "2093-01-01T00:00:00.000Z",
    }],
  });
  assert.equal(
    database.getState().dailyReviews.find((review) => review.dateKey === "2035-01-02").positive,
    "Imported positive"
  );
});

test("weekly reviews keep drafts, legacy reflections and completion state in sync", () => {
  const draft = database.saveWeeklyReview({
    weekKey: "2036-03-03",
    positive: "Strong planning",
    improvement: "Reduce context switches",
    customQuestions: [{ id: "weekly-energy", question: "Energy?", answer: "Stable" }],
  });
  assert.equal(draft.weekKey, "2036-03-03");
  assert.equal(draft.completedAt, null);
  assert.equal(draft.customQuestions[0].answer, "Stable");

  const completed = database.saveWeeklyReview({
    weekKey: "2036-03-03",
    positive: draft.positive,
    improvement: draft.improvement,
    customQuestions: draft.customQuestions,
    complete: true,
  });
  assert.ok(completed.completedAt);

  const exported = database.exportGoalsForSync().weekly.find(
    (week) => week.week === "2036-03-03"
  );
  assert.equal(exported.positive, "Strong planning");
  assert.equal(exported.custom_questions[0].question, "Energy?");
  assert.ok(exported.completed_at);

  database.importGoalsFromSync({
    weekly: [{
      week: "2036-03-03",
      reflection: "Legacy update must not clear the review",
      priorities: [],
      updated_at: "2096-01-01T00:00:00.000Z",
    }],
  });
  const preserved = database.getState().weeklyReviews.find(
    (review) => review.weekKey === "2036-03-03"
  );
  assert.equal(preserved.positive, "Strong planning");
  assert.ok(preserved.completedAt);

  database.importGoalsFromSync({
    weekly: [{
      week: "2036-03-10",
      reflection: "Old combined weekly reflection",
      priorities: [],
      updated_at: "2096-01-02T00:00:00.000Z",
    }],
  });
  const legacy = database.getState().weeklyReviews.find(
    (review) => review.weekKey === "2036-03-10"
  );
  assert.equal(legacy.customQuestions[0].question, "Bisherige Wochenreflexion");
  assert.equal(legacy.customQuestions[0].answer, "Old combined weekly reflection");
});

test("habit pauses are validated, synchronized and block paused dates", () => {
  const habit = database.createHabit({ name: "Training", targetPerWeek: 3 });
  assert.equal(habit.status, "active");
  assert.equal(habit.pauseStart, null);

  const paused = database.updateHabit(habit.id, {
    status: "paused",
    pauseStart: "2034-08-10",
    pauseEnd: "2034-08-16",
  });
  assert.equal(paused.status, "paused");
  assert.equal(paused.pauseStart, "2034-08-10");
  assert.equal(paused.pauseEnd, "2034-08-16");
  assert.throws(
    () => database.toggleHabitCompletion(habit.id, "2034-08-12"),
    (error) => error.status === 409
  );
  assert.ok(database.toggleHabitCompletion(habit.id, "2034-08-17").completions.includes("2034-08-17"));

  const exported = database.exportHabitsForSync().habits.find((entry) => entry.id === habit.id);
  assert.equal(exported.status, "paused");
  assert.equal(exported.pause_start, "2034-08-10");
  assert.equal(exported.pause_end, "2034-08-16");

  database.importHabitsFromSync({
    habits: [{
      id: habit.id,
      name: habit.name,
      target_per_week: habit.targetPerWeek,
      completions: [],
      updated_at: "2094-01-01T00:00:00.000Z",
    }],
  });
  const preserved = database.listHabits().habits.find((entry) => entry.id === habit.id);
  assert.equal(preserved.status, "paused");
  assert.equal(preserved.pauseEnd, "2034-08-16");

  const active = database.updateHabit(habit.id, { status: "active" });
  assert.equal(active.status, "active");
  assert.equal(active.pauseStart, null);
  assert.equal(active.pauseEnd, null);
});

test("habit frequency supports day, week and month sync formats", () => {
  const daily = database.createHabit({
    name: "Daily routine",
    frequencyPeriod: "day",
    targetCount: 9,
  });
  const monthly = database.createHabit({
    name: "Monthly routine",
    frequencyPeriod: "month",
    targetCount: 31,
  });
  const weekly = database.createHabit({ name: "Weekly routine", targetPerWeek: 4 });

  assert.equal(daily.frequencyPeriod, "day");
  assert.equal(daily.targetCount, 1);
  assert.equal(monthly.frequencyPeriod, "month");
  assert.equal(monthly.targetCount, 31);
  assert.equal(weekly.frequencyPeriod, "week");
  assert.equal(weekly.targetCount, 4);

  const exported = database.exportHabitsForSync().habits.find((habit) => habit.id === monthly.id);
  assert.equal(exported.frequency_period, "month");
  assert.equal(exported.target_count, 31);

  database.importHabitsFromSync({
    habits: [{
      id: monthly.id,
      name: monthly.name,
      target_per_week: 6,
      completions: [],
      updated_at: "2095-01-01T00:00:00.000Z",
    }],
  });
  const preserved = database.listHabits().habits.find((habit) => habit.id === monthly.id);
  assert.equal(preserved.frequencyPeriod, "month");
  assert.equal(preserved.targetCount, 31);
});

test("parent deletion keeps children and synchronizes the unlink", () => {
  const monthly = database.createGoal({
    period: "monthly",
    periodKey: "2027-03",
    title: "Disposable parent",
  });
  const priority = database.createWeeklyPriority({
    weekKey: "2027-03-01",
    text: "Persistent child",
    monthlyGoalId: monthly.id,
  });

  assert.equal(database.deleteGoal(monthly.id), true);
  const savedPriority = database.getState().weeklyPriorities.find((entry) => entry.id === priority.id);
  assert.equal(savedPriority.monthlyGoalId, null);

  const exported = database.exportGoalsForSync();
  assert.ok(exported.deleted.some((entry) => entry.type === "goal" && entry.id === monthly.id));
  const remotePriority = exported.weekly
    .flatMap((week) => week.priorities)
    .find((entry) => entry.id === priority.id);
  assert.equal(remotePriority.monthly_goal_id, null);
});

test("old sync data preserves a relation while explicit null removes it", () => {
  const yearly = database.createGoal({
    period: "yearly",
    periodKey: "2030",
    title: "Parent for compatibility",
  });
  const monthly = database.createGoal({
    period: "monthly",
    periodKey: "2030-04",
    title: "Compatibility child",
    description: "Preserved",
    parentGoalId: yearly.id,
  });

  database.importGoalsFromSync({
    monthly: [{
      id: monthly.id,
      month: "2030-04",
      title: monthly.title,
      description: monthly.description,
      subtasks: [],
      updated_at: "2090-01-01T00:00:00.000Z",
    }],
  });
  assert.equal(
    database.getState().monthlyGoals.find((goal) => goal.id === monthly.id).parentGoalId,
    yearly.id
  );

  database.importGoalsFromSync({
    monthly: [{
      id: monthly.id,
      month: "2030-04",
      title: monthly.title,
      description: monthly.description,
      yearly_goal_id: null,
      subtasks: [],
      updated_at: "2090-01-02T00:00:00.000Z",
    }],
  });
  assert.equal(
    database.getState().monthlyGoals.find((goal) => goal.id === monthly.id).parentGoalId,
    null
  );
});

test("tombstones suppress older live data and allow a newer resurrection", () => {
  const remoteTask = {
    id: "remote-lww-task",
    date: "2032-06-14",
    time: "16:35",
    text: "Remote task",
    done: false,
    updated_at: "2091-01-01T00:00:00.000Z",
  };

  database.importGoalsFromSync({ daily: [remoteTask] });
  database.importGoalsFromSync({
    deleted: [{
      type: "daily_task",
      id: remoteTask.id,
      deleted_at: "2091-01-02T00:00:00.000Z",
    }],
  });
  assert.equal(findTask(remoteTask.id), undefined);

  database.importGoalsFromSync({ daily: [remoteTask] });
  assert.equal(findTask(remoteTask.id), undefined);

  database.importGoalsFromSync({
    daily: [{ ...remoteTask, updated_at: "2091-01-03T00:00:00.000Z" }],
  });
  assert.equal(findTask(remoteTask.id).time, "16:35");
  assert.ok(!database.exportGoalsForSync().deleted.some((entry) => entry.id === remoteTask.id));
});

test("imports legacy hours and rejects malformed time values safely", () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    database.importGoalsFromSync({
      daily: [
        {
          id: "legacy-hour-task",
          date: "2033-01-03",
          hour: 17,
          text: "Legacy hour",
          updated_at: "2092-01-01T00:00:00.000Z",
        },
        {
          id: "invalid-time-task",
          date: "2033-01-03",
          time: "28:90",
          text: "Invalid time",
          updated_at: "2092-01-01T00:00:00.000Z",
        },
      ],
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(findTask("legacy-hour-task").time, "17:00");
  assert.equal(findTask("invalid-time-task").time, "00:00");
  assert.equal(warnings.length, 1);
});
