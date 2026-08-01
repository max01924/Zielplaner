import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = resolve(rootDir, "data", "goals.db");

mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");

let writeListener = () => {};

function nowIso() {
  return new Date().toISOString();
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentPeriodKey(period) {
  const now = new Date();
  if (period === "monthly") {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  return String(now.getFullYear());
}

function currentMonthKey() {
  return currentPeriodKey("monthly");
}

function parseHourFromTime(time) {
  const hour = Number.parseInt(String(time).split(":")[0], 10);
  return Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 0;
}

function timeFromHour(hour) {
  const safeHour = Number.isFinite(Number(hour)) ? Math.max(0, Math.min(23, Number(hour))) : 0;
  return `${String(Math.trunc(safeHour)).padStart(2, "0")}:00`;
}

function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeTargetPerWeek(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 7;
  }
  return Math.max(1, Math.min(7, Math.trunc(number)));
}

function isJsonNewer(jsonUpdatedAt, sqliteUpdatedAt) {
  const jsonTime = Date.parse(jsonUpdatedAt ?? "");
  const sqliteTime = Date.parse(sqliteUpdatedAt ?? "");

  if (Number.isNaN(jsonTime)) {
    return false;
  }
  if (Number.isNaN(sqliteTime)) {
    return true;
  }
  return jsonTime > sqliteTime;
}

function notifyWrite() {
  writeListener();
}

function addColumnIfMissing(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function normalizeMissingTimestamps(tableName) {
  const timestamp = nowIso();
  db.prepare(`
    UPDATE ${tableName}
    SET updated_at = ?
    WHERE updated_at IS NULL OR updated_at = ''
  `).run(timestamp);
}

function normalizeTimestampFormat(tableName) {
  const rows = db.prepare(`SELECT id, updated_at FROM ${tableName}`).all();
  const update = db.prepare(`UPDATE ${tableName} SET updated_at = ? WHERE id = ?`);

  for (const row of rows) {
    if (!row.updated_at || String(row.updated_at).includes("T")) {
      continue;
    }

    const parsed = Date.parse(`${row.updated_at}Z`.replace(" ", "T"));
    if (!Number.isNaN(parsed)) {
      update.run(new Date(parsed).toISOString(), row.id);
    }
  }
}

function migrateSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_tasks (
      id TEXT PRIMARY KEY,
      date_key TEXT NOT NULL,
      time TEXT NOT NULL,
      text TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      period TEXT NOT NULL CHECK (period IN ('monthly', 'yearly')),
      period_key TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      text TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_per_week INTEGER NOT NULL DEFAULT 7,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
      UNIQUE (habit_id, date)
    );
  `);

  addColumnIfMissing("daily_tasks", "updated_at", "TEXT");
  addColumnIfMissing("goals", "period_key", "TEXT");
  addColumnIfMissing("goals", "updated_at", "TEXT");
  addColumnIfMissing("checklist_items", "updated_at", "TEXT");
  addColumnIfMissing("habits", "updated_at", "TEXT");
  addColumnIfMissing("habit_completions", "updated_at", "TEXT");

  normalizeMissingTimestamps("daily_tasks");
  normalizeMissingTimestamps("goals");
  normalizeMissingTimestamps("checklist_items");
  normalizeMissingTimestamps("habits");
  normalizeMissingTimestamps("habit_completions");
  normalizeTimestampFormat("daily_tasks");
  normalizeTimestampFormat("goals");
  normalizeTimestampFormat("checklist_items");
  normalizeTimestampFormat("habits");
  normalizeTimestampFormat("habit_completions");

  db.prepare(`
    UPDATE goals
    SET period_key = CASE
      WHEN period = 'monthly' THEN ?
      ELSE ?
    END
    WHERE period_key IS NULL OR period_key = ''
  `).run(currentPeriodKey("monthly"), currentPeriodKey("yearly"));

  db.exec(`
    CREATE INDEX IF NOT EXISTS daily_tasks_date_key_idx
      ON daily_tasks (date_key, time);

    CREATE INDEX IF NOT EXISTS goals_period_idx
      ON goals (period, period_key, created_at);

    CREATE INDEX IF NOT EXISTS checklist_items_goal_id_idx
      ON checklist_items (goal_id, created_at);

    CREATE INDEX IF NOT EXISTS habits_created_at_idx
      ON habits (created_at);

    CREATE INDEX IF NOT EXISTS habit_completions_habit_date_idx
      ON habit_completions (habit_id, date);
  `);
}

migrateSchema();

const getDailyTaskStatement = db.prepare(`
  SELECT id, date_key, time, text, done, updated_at
  FROM daily_tasks
  WHERE id = ?
`);

const getGoalStatement = db.prepare(`
  SELECT id, period, period_key, title, description, updated_at
  FROM goals
  WHERE id = ?
`);

const getChecklistItemStatement = db.prepare(`
  SELECT id, goal_id, text, done, updated_at
  FROM checklist_items
  WHERE id = ?
`);

const getHabitStatement = db.prepare(`
  SELECT id, name, target_per_week, created_at, updated_at
  FROM habits
  WHERE id = ?
`);

const getHabitCompletionStatement = db.prepare(`
  SELECT id, habit_id, date, updated_at
  FROM habit_completions
  WHERE habit_id = ? AND date = ?
`);

function mapDailyTask(row) {
  return {
    id: row.id,
    dateKey: row.date_key,
    time: row.time,
    text: row.text,
    done: Boolean(row.done),
  };
}

function mapChecklistItem(row) {
  return {
    id: row.id,
    text: row.text,
    done: Boolean(row.done),
  };
}

function getChecklistForGoal(goalId) {
  return db
    .prepare(`
      SELECT id, goal_id, text, done, updated_at
      FROM checklist_items
      WHERE goal_id = ?
      ORDER BY created_at ASC, id ASC
    `)
    .all(goalId)
    .map(mapChecklistItem);
}

function mapGoal(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    checklist: getChecklistForGoal(row.id),
  };
}

function mapHabit(row, completions = []) {
  return {
    id: row.id,
    name: row.name,
    targetPerWeek: row.target_per_week,
    completions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getGoalById(goalId) {
  const row = getGoalStatement.get(goalId);
  return row ? mapGoal(row) : null;
}

function getHabitById(habitId) {
  const row = getHabitStatement.get(habitId);
  if (!row) {
    return null;
  }
  return mapHabit(row, getAllCompletionDatesForHabit(habitId));
}

function getChecklistItemById(itemId) {
  const row = getChecklistItemStatement.get(itemId);
  return row
    ? {
        id: row.id,
        goalId: row.goal_id,
        text: row.text,
        done: Boolean(row.done),
      }
    : null;
}

function getAllCompletionDatesForHabit(habitId) {
  return db
    .prepare(`
      SELECT date
      FROM habit_completions
      WHERE habit_id = ?
      ORDER BY date ASC
    `)
    .all(habitId)
    .map((completion) => completion.date);
}

function seedGoal(period, title, description, checklist) {
  const timestamp = nowIso();
  const goalId = randomUUID();
  db.prepare(`
    INSERT INTO goals (id, period, period_key, title, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(goalId, period, currentPeriodKey(period), title, description, timestamp, timestamp);

  const insertItem = db.prepare(`
    INSERT INTO checklist_items (id, goal_id, text, done, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const item of checklist) {
    const itemTimestamp = nowIso();
    insertItem.run(randomUUID(), goalId, item.text, item.done ? 1 : 0, itemTimestamp, itemTimestamp);
  }
}

function seedDatabaseIfEmpty() {
  const taskCount = db.prepare("SELECT COUNT(*) AS count FROM daily_tasks").get().count;
  const goalCount = db.prepare("SELECT COUNT(*) AS count FROM goals").get().count;

  if (taskCount > 0 || goalCount > 0) {
    return;
  }

  db.exec("BEGIN");
  try {
    const todayKey = toDateKey(new Date());
    const insertTask = db.prepare(`
      INSERT INTO daily_tasks (id, date_key, time, text, done, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const firstTaskTimestamp = nowIso();
    insertTask.run(randomUUID(), todayKey, "09:00", "Tagesfokus definieren", 1, firstTaskTimestamp, firstTaskTimestamp);
    const secondTaskTimestamp = nowIso();
    insertTask.run(randomUUID(), todayKey, "14:00", "GUI fertigstellen", 0, secondTaskTimestamp, secondTaskTimestamp);

    seedGoal("monthly", "NexusFalcon fertig", "Eigenständiges Monatsziel mit thematischem Bezug zu Tagesaufgaben.", [
      { text: "Kernfunktionen finalisieren", done: true },
      { text: "Design Review durchführen", done: false },
      { text: "Demo vorbereiten", done: false },
    ]);

    seedGoal("monthly", "Gesunde Arbeitsroutine stabilisieren", "Planung, Pausen und Review-Rhythmus verbindlich machen.", [
      { text: "Wöchentliche Retrospektive", done: false },
      { text: "Arbeitsblöcke auswerten", done: true },
    ]);

    seedGoal("yearly", "Ein großes Projekt fertig und präsentierfähig machen", "Bewusst breites Jahresziel, damit konkrete Projekte austauschbar bleiben.", [
      { text: "Projektkandidaten bewerten", done: true },
      { text: "Quartalsmeilensteine setzen", done: true },
      { text: "Präsentationsformat entwickeln", done: false },
    ]);

    seedGoal("yearly", "Mehr strategische Tiefe in der Arbeit aufbauen", "Schwerpunkt auf Qualität, Wirkung und belastbare Routinen.", [
      { text: "Lernfelder festlegen", done: false },
      { text: "Monatliche Review-Fragen definieren", done: false },
    ]);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

seedDatabaseIfEmpty();

export function setDatabaseWriteListener(listener) {
  writeListener = typeof listener === "function" ? listener : () => {};
}

export function getDatabasePath() {
  return dbPath;
}

export function getState() {
  const dailyTasks = {};
  const taskRows = db
    .prepare(`
      SELECT id, date_key, time, text, done, updated_at
      FROM daily_tasks
      ORDER BY date_key ASC, time ASC, created_at ASC
    `)
    .all();

  for (const row of taskRows) {
    const task = mapDailyTask(row);
    dailyTasks[task.dateKey] ??= [];
    dailyTasks[task.dateKey].push({
      id: task.id,
      time: task.time,
      text: task.text,
      done: task.done,
    });
  }

  const goals = db
    .prepare(`
      SELECT id, period, period_key, title, description, updated_at
      FROM goals
      ORDER BY created_at DESC, id DESC
    `)
    .all();

  return {
    dailyTasks,
    monthlyGoals: goals.filter((goal) => goal.period === "monthly").map(mapGoal),
    yearlyGoals: goals.filter((goal) => goal.period === "yearly").map(mapGoal),
  };
}

export function exportGoalsForSync() {
  const daily = db
    .prepare(`
      SELECT id, date_key, time, text, done, updated_at
      FROM daily_tasks
      ORDER BY date_key ASC, time ASC, created_at ASC
    `)
    .all()
    .map((task) => ({
      id: task.id,
      date: task.date_key,
      time: task.time,
      text: task.text,
      done: Boolean(task.done),
      updated_at: task.updated_at,
    }));

  const goals = db
    .prepare(`
      SELECT id, period, period_key, title, description, updated_at
      FROM goals
      ORDER BY period ASC, period_key ASC, created_at ASC
    `)
    .all();

  const subtasksStatement = db.prepare(`
    SELECT id, text, done, updated_at
    FROM checklist_items
    WHERE goal_id = ?
    ORDER BY created_at ASC, id ASC
  `);

  const monthly = [];
  const yearly = [];

  for (const goal of goals) {
    const sharedGoal = {
      id: goal.id,
      title: goal.title,
      description: goal.description ?? "",
      subtasks: subtasksStatement.all(goal.id).map((item) => ({
        id: item.id,
        text: item.text,
        done: Boolean(item.done),
        updated_at: item.updated_at,
      })),
      updated_at: goal.updated_at,
    };

    if (goal.period === "monthly") {
      monthly.push({
        ...sharedGoal,
        month: goal.period_key || currentPeriodKey("monthly"),
      });
    } else {
      yearly.push({
        ...sharedGoal,
        year: goal.period_key || currentPeriodKey("yearly"),
      });
    }
  }

  return { daily, monthly, yearly };
}

export function exportHabitsForSync() {
  const completionsStatement = db.prepare(`
    SELECT date
    FROM habit_completions
    WHERE habit_id = ?
    ORDER BY date ASC
  `);

  const habits = db
    .prepare(`
      SELECT id, name, target_per_week, created_at, updated_at
      FROM habits
      ORDER BY created_at ASC, id ASC
    `)
    .all()
    .map((habit) => ({
      id: habit.id,
      name: habit.name,
      target_per_week: habit.target_per_week,
      completions: completionsStatement.all(habit.id).map((completion) => completion.date),
      created_at: habit.created_at,
      updated_at: habit.updated_at,
    }));

  return { habits };
}

export function importGoalsFromSync(syncData) {
  let pulled = 0;
  const daily = Array.isArray(syncData?.daily) ? syncData.daily : [];
  const monthly = Array.isArray(syncData?.monthly) ? syncData.monthly : [];
  const yearly = Array.isArray(syncData?.yearly) ? syncData.yearly : [];

  db.exec("BEGIN");
  try {
    const insertDaily = db.prepare(`
      INSERT INTO daily_tasks (id, date_key, time, text, done, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const updateDaily = db.prepare(`
      UPDATE daily_tasks
      SET date_key = ?, time = ?, text = ?, done = ?, updated_at = ?
      WHERE id = ?
    `);

    for (const task of daily) {
      if (!task?.id || !task.date || typeof task.text !== "string") {
        continue;
      }

      const current = getDailyTaskStatement.get(task.id);
      const updatedAt = task.updated_at || nowIso();
      const done = task.done ? 1 : 0;
      let time = "00:00";

      if (typeof task.time === "string") {
        if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.time)) {
          time = task.time;
        } else {
          console.warn(`Ungueltiger time-Wert in goals.json fuer daily task ${task.id}: ${task.time}`);
        }
      } else if (task.hour !== undefined && task.hour !== null) {
        time = timeFromHour(task.hour);
      }

      if (!current) {
        insertDaily.run(task.id, task.date, time, task.text, done, updatedAt, updatedAt);
        pulled += 1;
      } else if (isJsonNewer(updatedAt, current.updated_at)) {
        updateDaily.run(task.date, time, task.text, done, updatedAt, task.id);
        pulled += 1;
      }
    }

    pulled += importGoalsByPeriod("monthly", monthly);
    pulled += importGoalsByPeriod("yearly", yearly);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return pulled;
}

export function importHabitsFromSync(syncData) {
  let pulled = 0;
  const habits = Array.isArray(syncData?.habits) ? syncData.habits : [];

  db.exec("BEGIN");
  try {
    const insertHabit = db.prepare(`
      INSERT INTO habits (id, name, target_per_week, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const updateHabitFromSync = db.prepare(`
      UPDATE habits
      SET name = ?, target_per_week = ?, updated_at = ?
      WHERE id = ?
    `);
    const insertCompletion = db.prepare(`
      INSERT OR IGNORE INTO habit_completions (id, habit_id, date, updated_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const habit of habits) {
      if (!habit?.id || typeof habit.name !== "string") {
        continue;
      }

      const updatedAt = habit.updated_at || nowIso();
      const createdAt = habit.created_at || updatedAt;
      const targetPerWeek = normalizeTargetPerWeek(habit.target_per_week);
      const current = getHabitStatement.get(habit.id);

      if (!current) {
        insertHabit.run(habit.id, habit.name, targetPerWeek, createdAt, updatedAt);
        pulled += 1;
      } else if (isJsonNewer(updatedAt, current.updated_at)) {
        updateHabitFromSync.run(habit.name, targetPerWeek, updatedAt, habit.id);
        pulled += 1;
      }

      const completions = Array.isArray(habit.completions) ? habit.completions : [];
      for (const date of completions) {
        if (!isDateKey(date)) {
          continue;
        }

        const inserted = insertCompletion.run(randomUUID(), habit.id, date, updatedAt).changes > 0;
        if (inserted) {
          pulled += 1;
        }
      }
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return pulled;
}

function importGoalsByPeriod(period, goals) {
  let pulled = 0;
  const insertGoal = db.prepare(`
    INSERT INTO goals (id, period, period_key, title, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updateGoalFromSync = db.prepare(`
    UPDATE goals
    SET period = ?, period_key = ?, title = ?, description = ?, updated_at = ?
    WHERE id = ?
  `);
  const insertItem = db.prepare(`
    INSERT INTO checklist_items (id, goal_id, text, done, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const updateItem = db.prepare(`
    UPDATE checklist_items
    SET text = ?, done = ?, updated_at = ?
    WHERE id = ?
  `);

  for (const goal of goals) {
    if (!goal?.id || typeof goal.title !== "string") {
      continue;
    }

    const periodKey = period === "monthly" ? goal.month : goal.year;
    const updatedAt = goal.updated_at || nowIso();
    const current = getGoalStatement.get(goal.id);
    const description =
      typeof goal.description === "string" ? goal.description : current?.description ?? "";

    if (!current) {
      insertGoal.run(
        goal.id,
        period,
        periodKey || currentPeriodKey(period),
        goal.title,
        description,
        updatedAt,
        updatedAt
      );
      pulled += 1;
    } else if (isJsonNewer(updatedAt, current.updated_at)) {
      updateGoalFromSync.run(
        period,
        periodKey || current.period_key || currentPeriodKey(period),
        goal.title,
        description,
        updatedAt,
        goal.id
      );
      pulled += 1;
    }

    const subtasks = Array.isArray(goal.subtasks) ? goal.subtasks : [];
    for (const item of subtasks) {
      if (!item?.id || typeof item.text !== "string") {
        continue;
      }

      const itemUpdatedAt = item.updated_at || updatedAt;
      const currentItem = getChecklistItemStatement.get(item.id);
      const done = item.done ? 1 : 0;

      if (!currentItem) {
        insertItem.run(item.id, goal.id, item.text, done, itemUpdatedAt, itemUpdatedAt);
        pulled += 1;
      } else if (isJsonNewer(itemUpdatedAt, currentItem.updated_at)) {
        updateItem.run(item.text, done, itemUpdatedAt, item.id);
        pulled += 1;
      }
    }
  }

  return pulled;
}

export function listHabits(monthKey = currentMonthKey()) {
  return {
    month: monthKey,
    habits: db
      .prepare(`
        SELECT id, name, target_per_week, created_at, updated_at
        FROM habits
        ORDER BY created_at DESC, id DESC
      `)
      .all()
      .map((habit) => mapHabit(habit, getAllCompletionDatesForHabit(habit.id))),
  };
}

export function createHabit({ name, targetPerWeek }) {
  const id = randomUUID();
  const timestamp = nowIso();
  db.prepare(`
    INSERT INTO habits (id, name, target_per_week, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, normalizeTargetPerWeek(targetPerWeek), timestamp, timestamp);
  notifyWrite();

  return getHabitById(id);
}

export function updateHabit(id, patch) {
  const current = getHabitStatement.get(id);
  if (!current) {
    return null;
  }

  db.prepare(`
    UPDATE habits
    SET name = ?, target_per_week = ?, updated_at = ?
    WHERE id = ?
  `).run(
    patch.name ?? current.name,
    patch.targetPerWeek === undefined
      ? current.target_per_week
      : normalizeTargetPerWeek(patch.targetPerWeek),
    nowIso(),
    id
  );
  notifyWrite();

  return getHabitById(id);
}

export function deleteHabit(id) {
  const deleted = db.prepare("DELETE FROM habits WHERE id = ?").run(id).changes > 0;
  if (deleted) {
    notifyWrite();
  }
  return deleted;
}

export function toggleHabitCompletion(habitId, date) {
  const habit = getHabitStatement.get(habitId);
  if (!habit || !isDateKey(date)) {
    return null;
  }

  const current = getHabitCompletionStatement.get(habitId, date);
  const timestamp = nowIso();

  if (current) {
    db.prepare("DELETE FROM habit_completions WHERE id = ?").run(current.id);
  } else {
    db.prepare(`
      INSERT INTO habit_completions (id, habit_id, date, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), habitId, date, timestamp);
  }

  db.prepare("UPDATE habits SET updated_at = ? WHERE id = ?").run(timestamp, habitId);
  notifyWrite();

  return getHabitById(habitId);
}

export function createDailyTask({ dateKey, time, text }) {
  const id = randomUUID();
  const timestamp = nowIso();
  db.prepare(`
    INSERT INTO daily_tasks (id, date_key, time, text, done, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).run(id, dateKey, time, text, timestamp, timestamp);
  notifyWrite();

  return mapDailyTask(getDailyTaskStatement.get(id));
}

export function updateDailyTask(id, patch) {
  const current = getDailyTaskStatement.get(id);
  if (!current) {
    return null;
  }

  const next = {
    time: patch.time ?? current.time,
    text: patch.text ?? current.text,
    done: typeof patch.done === "boolean" ? patch.done : Boolean(current.done),
  };

  db.prepare(`
    UPDATE daily_tasks
    SET time = ?, text = ?, done = ?, updated_at = ?
    WHERE id = ?
  `).run(next.time, next.text, next.done ? 1 : 0, nowIso(), id);
  notifyWrite();

  return mapDailyTask(getDailyTaskStatement.get(id));
}

export function deleteDailyTask(id) {
  const deleted = db.prepare("DELETE FROM daily_tasks WHERE id = ?").run(id).changes > 0;
  if (deleted) {
    notifyWrite();
  }
  return deleted;
}

export function createGoal({ period, title, description }) {
  const id = randomUUID();
  const timestamp = nowIso();
  db.prepare(`
    INSERT INTO goals (id, period, period_key, title, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, period, currentPeriodKey(period), title, description ?? "", timestamp, timestamp);
  notifyWrite();

  return getGoalById(id);
}

export function updateGoal(id, patch) {
  const current = getGoalStatement.get(id);
  if (!current) {
    return null;
  }

  db.prepare(`
    UPDATE goals
    SET title = ?, description = ?, updated_at = ?
    WHERE id = ?
  `).run(patch.title ?? current.title, patch.description ?? current.description, nowIso(), id);
  notifyWrite();

  return getGoalById(id);
}

export function deleteGoal(id) {
  const deleted = db.prepare("DELETE FROM goals WHERE id = ?").run(id).changes > 0;
  if (deleted) {
    notifyWrite();
  }
  return deleted;
}

export function createChecklistItem(goalId, text) {
  if (!getGoalStatement.get(goalId)) {
    return null;
  }

  const id = randomUUID();
  const timestamp = nowIso();
  db.prepare(`
    INSERT INTO checklist_items (id, goal_id, text, done, created_at, updated_at)
    VALUES (?, ?, ?, 0, ?, ?)
  `).run(id, goalId, text, timestamp, timestamp);
  notifyWrite();

  return getChecklistItemById(id);
}

export function updateChecklistItem(id, patch) {
  const current = getChecklistItemById(id);
  if (!current) {
    return null;
  }

  db.prepare(`
    UPDATE checklist_items
    SET text = ?, done = ?, updated_at = ?
    WHERE id = ?
  `).run(patch.text ?? current.text, typeof patch.done === "boolean" ? (patch.done ? 1 : 0) : (current.done ? 1 : 0), nowIso(), id);
  notifyWrite();

  return getChecklistItemById(id);
}

export function deleteChecklistItem(id) {
  const deleted = db.prepare("DELETE FROM checklist_items WHERE id = ?").run(id).changes > 0;
  if (deleted) {
    notifyWrite();
  }
  return deleted;
}
