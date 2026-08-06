import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = process.env.DATABASE_PATH
  ? resolve(process.env.DATABASE_PATH)
  : resolve(rootDir, "data", "goals.db");

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
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3]);
}

function dateFromKey(value) {
  if (!isDateKey(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDaysToDateKey(value, amount) {
  const date = dateFromKey(value);
  if (!date) {
    return null;
  }
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

function startOfIsoWeekKey(value) {
  const date = dateFromKey(value);
  if (!date) {
    return null;
  }
  const weekday = date.getDay() || 7;
  date.setDate(date.getDate() - weekday + 1);
  return toDateKey(date);
}

function normalizeTargetPerWeek(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 7;
  }
  return Math.max(1, Math.min(7, Math.trunc(number)));
}

function normalizeFrequencyPeriod(value) {
  return value === "day" || value === "month" ? value : "week";
}

function normalizeHabitTarget(period, value) {
  const frequencyPeriod = normalizeFrequencyPeriod(period);
  if (frequencyPeriod === "day") return 1;
  const number = Number(value);
  const fallback = frequencyPeriod === "month" ? 1 : 7;
  const maximum = frequencyPeriod === "month" ? 31 : 7;
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.min(maximum, Math.trunc(number)));
}

function normalizeHabitPause(status, pauseStart, pauseEnd) {
  const normalizedStatus = status === "paused" ? "paused" : "active";
  if (normalizedStatus === "active") {
    return { status: normalizedStatus, pauseStart: null, pauseEnd: null };
  }
  if (!isDateKey(pauseStart) || !isDateKey(pauseEnd) || pauseStart > pauseEnd) {
    const error = new Error("Für eine Pause werden ein gültiges Start- und Enddatum benötigt.");
    error.status = 400;
    throw error;
  }
  return { status: normalizedStatus, pauseStart, pauseEnd };
}

function isHabitPausedOnDate(habit, dateKey) {
  return habit.status === "paused"
    && isDateKey(habit.pause_start)
    && isDateKey(habit.pause_end)
    && dateKey >= habit.pause_start
    && dateKey <= habit.pause_end;
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

function makeWeeklyPriorityWeekOptional() {
  const weekColumn = db
    .prepare("PRAGMA table_info(weekly_priorities)")
    .all()
    .find((column) => column.name === "week_key");
  if (!weekColumn?.notnull) return;

  db.exec("PRAGMA foreign_keys = OFF");
  try {
    db.exec(`
      BEGIN;
      DROP TABLE IF EXISTS weekly_priorities_migrated;
      CREATE TABLE weekly_priorities_migrated (
        id TEXT PRIMARY KEY,
        week_key TEXT,
        text TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        monthly_goal_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (week_key) REFERENCES weekly_plans(week_key) ON DELETE CASCADE,
        FOREIGN KEY (monthly_goal_id) REFERENCES goals(id) ON DELETE SET NULL
      );
      INSERT INTO weekly_priorities_migrated
        (id, week_key, text, done, monthly_goal_id, created_at, updated_at)
      SELECT id, week_key, text, done, monthly_goal_id, created_at, updated_at
      FROM weekly_priorities;
      DROP TABLE weekly_priorities;
      ALTER TABLE weekly_priorities_migrated RENAME TO weekly_priorities;
      COMMIT;
    `);
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The migration may fail before the transaction starts.
    }
    throw error;
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}

function migrateMonthlyChecklistToWeeklyPriorities() {
  const items = db.prepare(`
    SELECT checklist_items.id, checklist_items.goal_id, checklist_items.text,
      checklist_items.done, checklist_items.created_at, checklist_items.updated_at
    FROM checklist_items
    JOIN goals ON goals.id = checklist_items.goal_id
    WHERE goals.period = 'monthly'
  `).all();
  if (!items.length) return;

  const insertPriority = db.prepare(`
    INSERT INTO weekly_priorities
      (id, week_key, text, done, monthly_goal_id, created_at, updated_at)
    VALUES (?, NULL, ?, ?, ?, ?, ?)
  `);
  const insertTombstone = db.prepare(`
    INSERT INTO sync_tombstones (entity_type, entity_id, deleted_at)
    VALUES ('checklist_item', ?, ?)
    ON CONFLICT(entity_type, entity_id) DO UPDATE SET deleted_at = excluded.deleted_at
    WHERE excluded.deleted_at > sync_tombstones.deleted_at
  `);

  db.exec("BEGIN");
  try {
    for (const item of items) {
      const idExists = db.prepare("SELECT 1 FROM weekly_priorities WHERE id = ?").get(item.id);
      const priorityId = idExists ? randomUUID() : item.id;
      const timestamp = item.updated_at || nowIso();
      insertPriority.run(
        priorityId,
        item.text,
        item.done ? 1 : 0,
        item.goal_id,
        item.created_at || timestamp,
        timestamp
      );
      insertTombstone.run(item.id, timestamp);
      db.prepare("DELETE FROM checklist_items WHERE id = ?").run(item.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
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

function normalizeTimestampFormat(tableName, keyColumn = "id") {
  const rows = db.prepare(`SELECT ${keyColumn}, updated_at FROM ${tableName}`).all();
  const update = db.prepare(`UPDATE ${tableName} SET updated_at = ? WHERE ${keyColumn} = ?`);

  for (const row of rows) {
    if (!row.updated_at || String(row.updated_at).includes("T")) {
      continue;
    }

    const parsed = Date.parse(`${row.updated_at}Z`.replace(" ", "T"));
    if (!Number.isNaN(parsed)) {
      update.run(new Date(parsed).toISOString(), row[keyColumn]);
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
      is_daily_focus INTEGER NOT NULL DEFAULT 0,
      postponed_from_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_reviews (
      date_key TEXT PRIMARY KEY,
      positive TEXT NOT NULL DEFAULT '',
      improvement TEXT NOT NULL DEFAULT '',
      custom_questions TEXT NOT NULL DEFAULT '[]',
      question_set TEXT,
      completed_at TEXT,
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
      frequency_period TEXT NOT NULL DEFAULT 'week',
      target_count INTEGER NOT NULL DEFAULT 7,
      status TEXT NOT NULL DEFAULT 'active',
      pause_start TEXT,
      pause_end TEXT,
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

    CREATE TABLE IF NOT EXISTS weekly_plans (
      week_key TEXT PRIMARY KEY,
      reflection TEXT NOT NULL DEFAULT '',
      positive TEXT NOT NULL DEFAULT '',
      improvement TEXT NOT NULL DEFAULT '',
      custom_questions TEXT NOT NULL DEFAULT '[]',
      question_set TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weekly_priorities (
      id TEXT PRIMARY KEY,
      week_key TEXT,
      text TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (week_key) REFERENCES weekly_plans(week_key) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_tombstones (
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      deleted_at TEXT NOT NULL,
      PRIMARY KEY (entity_type, entity_id)
    );
  `);

  addColumnIfMissing("daily_tasks", "updated_at", "TEXT");
  addColumnIfMissing("daily_tasks", "is_daily_focus", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing("daily_tasks", "postponed_from_date", "TEXT");
  addColumnIfMissing("daily_reviews", "question_set", "TEXT");
  addColumnIfMissing(
    "daily_tasks",
    "weekly_priority_id",
    "TEXT REFERENCES weekly_priorities(id) ON DELETE SET NULL"
  );
  addColumnIfMissing("goals", "period_key", "TEXT");
  addColumnIfMissing("goals", "updated_at", "TEXT");
  addColumnIfMissing(
    "goals",
    "parent_goal_id",
    "TEXT REFERENCES goals(id) ON DELETE SET NULL"
  );
  addColumnIfMissing("checklist_items", "updated_at", "TEXT");
  addColumnIfMissing("habits", "updated_at", "TEXT");
  addColumnIfMissing("habits", "frequency_period", "TEXT NOT NULL DEFAULT 'week'");
  addColumnIfMissing("habits", "target_count", "INTEGER");
  addColumnIfMissing("habits", "status", "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing("habits", "pause_start", "TEXT");
  addColumnIfMissing("habits", "pause_end", "TEXT");
  addColumnIfMissing("habit_completions", "updated_at", "TEXT");
  addColumnIfMissing("weekly_plans", "updated_at", "TEXT");
  addColumnIfMissing("weekly_plans", "positive", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing("weekly_plans", "improvement", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing("weekly_plans", "custom_questions", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing("weekly_plans", "question_set", "TEXT");
  addColumnIfMissing("weekly_plans", "completed_at", "TEXT");
  addColumnIfMissing("weekly_priorities", "updated_at", "TEXT");
  addColumnIfMissing(
    "weekly_priorities",
    "monthly_goal_id",
    "TEXT REFERENCES goals(id) ON DELETE SET NULL"
  );
  makeWeeklyPriorityWeekOptional();
  migrateMonthlyChecklistToWeeklyPriorities();

  db.prepare(`
    UPDATE habits
    SET frequency_period = 'week'
    WHERE frequency_period IS NULL OR frequency_period NOT IN ('day', 'week', 'month')
  `).run();
  db.prepare(`
    UPDATE habits
    SET target_count = target_per_week
    WHERE target_count IS NULL
  `).run();

  normalizeMissingTimestamps("daily_tasks");
  normalizeMissingTimestamps("daily_reviews");
  normalizeMissingTimestamps("goals");
  normalizeMissingTimestamps("checklist_items");
  normalizeMissingTimestamps("habits");
  normalizeMissingTimestamps("habit_completions");
  normalizeMissingTimestamps("weekly_plans");
  normalizeMissingTimestamps("weekly_priorities");
  normalizeTimestampFormat("daily_tasks");
  normalizeTimestampFormat("daily_reviews", "date_key");
  normalizeTimestampFormat("goals");
  normalizeTimestampFormat("checklist_items");
  normalizeTimestampFormat("habits");
  normalizeTimestampFormat("habit_completions");
  normalizeTimestampFormat("weekly_plans", "week_key");
  normalizeTimestampFormat("weekly_priorities");

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

    CREATE INDEX IF NOT EXISTS daily_tasks_weekly_priority_idx
      ON daily_tasks (weekly_priority_id);

    CREATE INDEX IF NOT EXISTS daily_reviews_updated_idx
      ON daily_reviews (updated_at);

    CREATE INDEX IF NOT EXISTS goals_period_idx
      ON goals (period, period_key, created_at);

    CREATE INDEX IF NOT EXISTS goals_parent_idx
      ON goals (parent_goal_id);

    CREATE INDEX IF NOT EXISTS checklist_items_goal_id_idx
      ON checklist_items (goal_id, created_at);

    CREATE INDEX IF NOT EXISTS habits_created_at_idx
      ON habits (created_at);

    CREATE INDEX IF NOT EXISTS habit_completions_habit_date_idx
      ON habit_completions (habit_id, date);

    CREATE INDEX IF NOT EXISTS weekly_priorities_week_key_idx
      ON weekly_priorities (week_key, created_at);

    CREATE INDEX IF NOT EXISTS weekly_priorities_monthly_goal_idx
      ON weekly_priorities (monthly_goal_id);
  `);
}

migrateSchema();

const getDailyTaskStatement = db.prepare(`
  SELECT id, date_key, time, text, done, is_daily_focus, weekly_priority_id,
    postponed_from_date, updated_at
  FROM daily_tasks
  WHERE id = ?
`);

const getDailyReviewStatement = db.prepare(`
  SELECT date_key, positive, improvement, custom_questions, question_set,
    completed_at, created_at, updated_at
  FROM daily_reviews
  WHERE date_key = ?
`);

const getGoalStatement = db.prepare(`
  SELECT id, period, period_key, title, description, parent_goal_id, updated_at
  FROM goals
  WHERE id = ?
`);

const getChecklistItemStatement = db.prepare(`
  SELECT id, goal_id, text, done, updated_at
  FROM checklist_items
  WHERE id = ?
`);

const getHabitStatement = db.prepare(`
  SELECT id, name, target_per_week, frequency_period, target_count,
    status, pause_start, pause_end, created_at, updated_at
  FROM habits
  WHERE id = ?
`);

const getHabitCompletionStatement = db.prepare(`
  SELECT id, habit_id, date, updated_at
  FROM habit_completions
  WHERE habit_id = ? AND date = ?
`);

const getWeeklyPlanStatement = db.prepare(`
  SELECT week_key, reflection, positive, improvement, custom_questions, question_set,
    completed_at, created_at, updated_at
  FROM weekly_plans
  WHERE week_key = ?
`);

const getWeeklyPriorityStatement = db.prepare(`
  SELECT id, week_key, text, done, monthly_goal_id, created_at, updated_at
  FROM weekly_priorities
  WHERE id = ?
`);

function mapDailyTask(row) {
  return {
    id: row.id,
    dateKey: row.date_key,
    time: row.time,
    text: row.text,
    done: Boolean(row.done),
    isDailyFocus: Boolean(row.is_daily_focus),
    weeklyPriorityId: row.weekly_priority_id ?? null,
    postponedFromDate: row.postponed_from_date ?? null,
  };
}

function normalizeCustomQuestions(value) {
  let questions = value;
  if (typeof value === "string") {
    try {
      questions = JSON.parse(value);
    } catch {
      questions = [];
    }
  }
  if (!Array.isArray(questions)) return [];
  return questions
    .filter((item) => item && typeof item.question === "string" && item.question.trim())
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : randomUUID(),
      question: item.question.trim(),
      answer: typeof item.answer === "string" ? item.answer : "",
    }));
}

function normalizeReviewQuestions(value) {
  let questions = value;
  if (typeof value === "string") {
    try {
      questions = JSON.parse(value);
    } catch {
      questions = [];
    }
  }
  if (!Array.isArray(questions)) return [];
  return questions
    .filter((item) => item && typeof item.question === "string" && item.question.trim())
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : randomUUID(),
      kind: item.kind === "positive" || item.kind === "improvement" ? item.kind : "custom",
      question: item.question.trim(),
      answer: typeof item.answer === "string" ? item.answer : "",
    }));
}

function legacyReviewQuestions(row, customQuestions = normalizeCustomQuestions(row?.custom_questions)) {
  return [
    {
      id: "positive",
      kind: "positive",
      question: "Was war positiv?",
      answer: row?.positive ?? "",
    },
    {
      id: "improvement",
      kind: "improvement",
      question: "Was muss verbessert werden?",
      answer: row?.improvement ?? "",
    },
    ...customQuestions.map((item) => ({ ...item, kind: "custom" })),
  ];
}

function reviewQuestions(row, customQuestions) {
  if (row?.question_set !== null && row?.question_set !== undefined) {
    return normalizeReviewQuestions(row.question_set);
  }
  return legacyReviewQuestions(row, customQuestions);
}

function mapDailyReview(row) {
  const customQuestions = normalizeCustomQuestions(row.custom_questions);
  return {
    dateKey: row.date_key,
    positive: row.positive ?? "",
    improvement: row.improvement ?? "",
    customQuestions,
    questions: reviewQuestions(row, customQuestions),
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function weeklyReviewQuestions(row) {
  const questions = normalizeCustomQuestions(row?.custom_questions);
  if (questions.length || !row?.reflection?.trim()) return questions;
  return [{
    id: "legacy-weekly-reflection",
    question: "Bisherige Wochenreflexion",
    answer: row.reflection.trim(),
  }];
}

function mapWeeklyReview(row) {
  if (!row) return null;
  const customQuestions = weeklyReviewQuestions(row);
  const hasReview = row.question_set !== null
    || Boolean(row.positive?.trim())
    || Boolean(row.improvement?.trim())
    || Boolean(row.reflection?.trim())
    || customQuestions.length > 0
    || Boolean(row.completed_at);
  return {
    weekKey: row.week_key,
    positive: row.positive ?? "",
    improvement: row.improvement ?? "",
    customQuestions,
    questions: reviewQuestions(row, customQuestions),
    hasReview,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    period: row.period,
    periodKey: row.period_key,
    title: row.title,
    description: row.description,
    parentGoalId: row.parent_goal_id ?? null,
    checklist: getChecklistForGoal(row.id),
  };
}

function mapHabit(row, completions = []) {
  const frequencyPeriod = normalizeFrequencyPeriod(row.frequency_period);
  const targetCount = normalizeHabitTarget(
    frequencyPeriod,
    row.target_count ?? row.target_per_week
  );
  return {
    id: row.id,
    name: row.name,
    targetPerWeek: row.target_per_week,
    frequencyPeriod,
    targetCount,
    status: row.status === "paused" ? "paused" : "active",
    pauseStart: row.pause_start ?? null,
    pauseEnd: row.pause_end ?? null,
    completions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWeeklyPriority(row) {
  return {
    id: row.id,
    weekKey: row.week_key ?? null,
    text: row.text,
    done: Boolean(row.done),
    monthlyGoalId: row.monthly_goal_id ?? null,
  };
}

function getWeeklyPriorities(weekKey) {
  return db
    .prepare(`
      SELECT id, week_key, text, done, monthly_goal_id, created_at, updated_at
      FROM weekly_priorities
      WHERE week_key = ?
      ORDER BY created_at ASC, id ASC
    `)
    .all(weekKey)
    .map(mapWeeklyPriority);
}

function ensureWeeklyPlan(weekKey, timestamp = nowIso()) {
  db.prepare(`
    INSERT OR IGNORE INTO weekly_plans (week_key, reflection, created_at, updated_at)
    VALUES (?, '', ?, ?)
  `).run(weekKey, timestamp, timestamp);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function relationError(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function normalizeRelationId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validatePeriodKey(period, periodKey) {
  const value = String(periodKey ?? "");
  const valid = period === "monthly" ? /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value) : /^\d{4}$/.test(value);
  if (!valid) {
    relationError(`Ungueltiger Zeitraum fuer ein ${period === "monthly" ? "Monats" : "Jahres"}ziel.`);
  }
  return value;
}

function weekMonthKeys(weekKey) {
  const normalizedWeekKey = startOfIsoWeekKey(weekKey);
  if (!normalizedWeekKey) {
    return [];
  }
  return [...new Set([normalizedWeekKey.slice(0, 7), addDaysToDateKey(normalizedWeekKey, 6).slice(0, 7)])];
}

function validateGoalParent(period, periodKey, parentGoalId) {
  const parentId = normalizeRelationId(parentGoalId);
  if (!parentId) {
    return null;
  }
  if (period !== "monthly") {
    relationError("Nur Monatsziele können einem Jahresziel zugeordnet werden.");
  }
  const parent = getGoalStatement.get(parentId);
  if (!parent || parent.period !== "yearly") {
    relationError("Das ausgewählte Jahresziel wurde nicht gefunden.");
  }
  if (parent.period_key !== String(periodKey).slice(0, 4)) {
    relationError("Monatsziel und Jahresziel müssen im selben Jahr liegen.");
  }
  return parentId;
}

function validatePriorityParent(weekKey, monthlyGoalId) {
  const parentId = normalizeRelationId(monthlyGoalId);
  if (!parentId) {
    return null;
  }
  const parent = getGoalStatement.get(parentId);
  if (!parent || parent.period !== "monthly") {
    relationError("Das ausgewählte Monatsziel wurde nicht gefunden.");
  }
  if (weekKey && !weekMonthKeys(weekKey).includes(parent.period_key)) {
    relationError("Das Monatsziel liegt außerhalb der ausgewählten ISO-Woche.");
  }
  return parentId;
}

function validateTaskParent(dateKey, weeklyPriorityId) {
  const parentId = normalizeRelationId(weeklyPriorityId);
  if (!parentId) {
    return null;
  }
  const parent = getWeeklyPriorityStatement.get(parentId);
  if (!parent) {
    relationError("Die ausgewählte Wochenpriorität wurde nicht gefunden.");
  }
  if (parent.week_key !== startOfIsoWeekKey(dateKey)) {
    relationError("Tagesaufgabe und Wochenpriorität müssen in derselben ISO-Woche liegen.");
  }
  return parentId;
}

function recordTombstone(entityType, entityId, deletedAt = nowIso()) {
  db.prepare(`
    INSERT INTO sync_tombstones (entity_type, entity_id, deleted_at)
    VALUES (?, ?, ?)
    ON CONFLICT(entity_type, entity_id) DO UPDATE SET deleted_at = excluded.deleted_at
    WHERE excluded.deleted_at > sync_tombstones.deleted_at
  `).run(entityType, entityId, deletedAt);
}

function liveEntryWins(entityType, entityId, updatedAt) {
  const tombstone = db
    .prepare("SELECT deleted_at FROM sync_tombstones WHERE entity_type = ? AND entity_id = ?")
    .get(entityType, entityId);
  if (!tombstone) {
    return true;
  }
  if (!isJsonNewer(updatedAt, tombstone.deleted_at)) {
    return false;
  }
  db.prepare("DELETE FROM sync_tombstones WHERE entity_type = ? AND entity_id = ?")
    .run(entityType, entityId);
  return true;
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
      SELECT id, date_key, time, text, done, is_daily_focus, weekly_priority_id,
        postponed_from_date, created_at, updated_at
      FROM daily_tasks
      ORDER BY date_key ASC, time ASC, created_at ASC
    `)
    .all();

  for (const row of taskRows) {
    const task = mapDailyTask(row);
    dailyTasks[task.dateKey] ??= [];
    dailyTasks[task.dateKey].push(task);
  }

  const goals = db
    .prepare(`
      SELECT id, period, period_key, title, description, parent_goal_id, updated_at
      FROM goals
      ORDER BY created_at DESC, id DESC
    `)
    .all();

  return {
    dailyTasks,
    dailyReviews: db
      .prepare(`
        SELECT date_key, positive, improvement, custom_questions, question_set,
          completed_at, created_at, updated_at
        FROM daily_reviews
        ORDER BY date_key DESC
      `)
      .all()
      .map(mapDailyReview),
    weeklyPriorities: db
      .prepare(`
        SELECT id, week_key, text, done, monthly_goal_id, created_at, updated_at
        FROM weekly_priorities
        ORDER BY week_key ASC, created_at ASC, id ASC
      `)
      .all()
      .map(mapWeeklyPriority),
    weeklyReviews: db
      .prepare(`
        SELECT week_key, reflection, positive, improvement, custom_questions, question_set,
          completed_at, created_at, updated_at
        FROM weekly_plans
        ORDER BY week_key DESC
      `)
      .all()
      .map(mapWeeklyReview),
    monthlyGoals: goals.filter((goal) => goal.period === "monthly").map(mapGoal),
    yearlyGoals: goals.filter((goal) => goal.period === "yearly").map(mapGoal),
  };
}

export function getWeeklyOverview(weekKey) {
  const normalizedWeekKey = startOfIsoWeekKey(weekKey);
  if (!normalizedWeekKey) {
    return null;
  }

  const weekEnd = addDaysToDateKey(normalizedWeekKey, 6);
  const previousWeekStart = addDaysToDateKey(normalizedWeekKey, -7);
  const previousWeekEnd = addDaysToDateKey(normalizedWeekKey, -1);
  const plan = getWeeklyPlanStatement.get(normalizedWeekKey);
  const taskStatement = db.prepare(`
    SELECT id, date_key, time, text, done, is_daily_focus, weekly_priority_id,
      postponed_from_date, updated_at
    FROM daily_tasks
    WHERE date_key BETWEEN ? AND ?
    ORDER BY date_key ASC, time ASC, created_at ASC
  `);
  const monthlyGoalRows = db
    .prepare(`
      SELECT id, period, period_key, title, description, parent_goal_id, updated_at
      FROM goals
      WHERE period = 'monthly' AND period_key IN (?, ?)
      ORDER BY created_at DESC, id DESC
    `)
    .all(normalizedWeekKey.slice(0, 7), weekEnd.slice(0, 7));
  const habitCompletionStatement = db.prepare(`
    SELECT date
    FROM habit_completions
    WHERE habit_id = ? AND date BETWEEN ? AND ?
    ORDER BY date ASC
  `);

  const habits = db
    .prepare(`
      SELECT id, name, target_per_week, frequency_period, target_count,
        status, pause_start, pause_end, created_at, updated_at
      FROM habits
      ORDER BY created_at ASC, id ASC
    `)
    .all()
    .filter((habit) => String(habit.created_at).slice(0, 10) <= weekEnd)
    .map((habit) => {
      const frequencyPeriod = normalizeFrequencyPeriod(habit.frequency_period);
      let rangeStart = normalizedWeekKey;
      let rangeEnd = weekEnd;
      let targetCount = normalizeHabitTarget(
        frequencyPeriod,
        habit.target_count ?? habit.target_per_week
      );
      let periodLabel = "diese Woche";
      if (frequencyPeriod === "day") {
        targetCount = 7;
      } else if (frequencyPeriod === "month") {
        const monthDate = dateFromKey(`${normalizedWeekKey.slice(0, 7)}-01`);
        const monthEndDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 12);
        rangeStart = `${normalizedWeekKey.slice(0, 7)}-01`;
        rangeEnd = toDateKey(monthEndDate);
        targetCount = Math.min(targetCount, monthEndDate.getDate());
        periodLabel = "diesen Monat";
      }
      const completions = habitCompletionStatement
        .all(habit.id, rangeStart, rangeEnd)
        .map((completion) => completion.date);
      return {
        id: habit.id,
        name: habit.name,
        frequencyPeriod,
        targetCount,
        targetPerWeek: targetCount,
        periodLabel,
        completed: completions.length,
        complete: completions.length >= targetCount,
        completions,
      };
    });

  return {
    weekKey: normalizedWeekKey,
    weekEnd,
    reflection: plan?.reflection ?? "",
    review: mapWeeklyReview(plan),
    priorities: getWeeklyPriorities(normalizedWeekKey),
    tasks: taskStatement.all(normalizedWeekKey, weekEnd).map(mapDailyTask),
    previousWeekOpenTasks: taskStatement
      .all(previousWeekStart, previousWeekEnd)
      .filter((task) => !task.done)
      .map(mapDailyTask),
    monthlyGoals: monthlyGoalRows.map(mapGoal),
    habits,
  };
}

export function createWeeklyPriority({ weekKey, text, monthlyGoalId = null }) {
  const normalizedWeekKey = weekKey ? startOfIsoWeekKey(weekKey) : null;
  if (weekKey && !normalizedWeekKey) {
    return null;
  }

  if (normalizedWeekKey) {
    const count = db
      .prepare("SELECT COUNT(*) AS count FROM weekly_priorities WHERE week_key = ?")
      .get(normalizedWeekKey).count;
    if (count >= 3) {
      const error = new Error("Pro Woche sind maximal drei Prioritaeten moeglich.");
      error.status = 409;
      throw error;
    }
  }

  const id = randomUUID();
  const timestamp = nowIso();
  const parentId = validatePriorityParent(normalizedWeekKey, monthlyGoalId);
  if (!normalizedWeekKey && !parentId) {
    relationError("Eine unzugeordnete Wochenprioritaet benoetigt eine Monatsprioritaet.");
  }
  if (normalizedWeekKey) {
    ensureWeeklyPlan(normalizedWeekKey, timestamp);
  }
  db.prepare(`
    INSERT INTO weekly_priorities
      (id, week_key, text, done, monthly_goal_id, created_at, updated_at)
    VALUES (?, ?, ?, 0, ?, ?, ?)
  `).run(id, normalizedWeekKey, text, parentId, timestamp, timestamp);
  notifyWrite();

  return mapWeeklyPriority(getWeeklyPriorityStatement.get(id));
}

export function updateWeeklyPriority(id, patch) {
  const current = getWeeklyPriorityStatement.get(id);
  if (!current) {
    return null;
  }

  const timestamp = nowIso();
  const weekKey = hasOwn(patch, "weekKey")
    ? (patch.weekKey ? startOfIsoWeekKey(patch.weekKey) : null)
    : current.week_key;
  if (hasOwn(patch, "weekKey") && patch.weekKey && !weekKey) {
    relationError("Ungueltige ISO-Woche.");
  }
  const parentId = hasOwn(patch, "monthlyGoalId")
    ? validatePriorityParent(weekKey, patch.monthlyGoalId)
    : validatePriorityParent(weekKey, current.monthly_goal_id);
  if (!weekKey && !parentId) {
    relationError("Eine unzugeordnete Wochenprioritaet benoetigt eine Monatsprioritaet.");
  }
  if (weekKey && weekKey !== current.week_key) {
    const count = db
      .prepare("SELECT COUNT(*) AS count FROM weekly_priorities WHERE week_key = ?")
      .get(weekKey).count;
    if (count >= 3) {
      const error = new Error("Pro Woche sind maximal drei Prioritaeten moeglich.");
      error.status = 409;
      throw error;
    }
    ensureWeeklyPlan(weekKey, timestamp);
  }
  db.exec("BEGIN");
  try {
    db.prepare(`
      UPDATE weekly_priorities
      SET week_key = ?, text = ?, done = ?, monthly_goal_id = ?, updated_at = ?
      WHERE id = ?
    `).run(
      weekKey,
      patch.text ?? current.text,
      typeof patch.done === "boolean" ? (patch.done ? 1 : 0) : current.done,
      parentId,
      timestamp,
      id
    );

    if (weekKey !== current.week_key) {
      const linkedTasks = db.prepare(`
        SELECT id, date_key
        FROM daily_tasks
        WHERE weekly_priority_id = ?
      `).all(id);
      const unlinkTask = db.prepare(`
        UPDATE daily_tasks
        SET weekly_priority_id = NULL, updated_at = ?
        WHERE id = ?
      `);
      for (const task of linkedTasks) {
        if (!weekKey || startOfIsoWeekKey(task.date_key) !== weekKey) {
          unlinkTask.run(timestamp, task.id);
        }
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  notifyWrite();

  return mapWeeklyPriority(getWeeklyPriorityStatement.get(id));
}

export function deleteWeeklyPriority(id) {
  const current = getWeeklyPriorityStatement.get(id);
  if (!current) {
    return false;
  }

  const timestamp = nowIso();
  db.exec("BEGIN");
  try {
    db.prepare(`
      UPDATE daily_tasks
      SET weekly_priority_id = NULL, updated_at = ?
      WHERE weekly_priority_id = ?
    `).run(timestamp, id);
    recordTombstone("weekly_priority", id, timestamp);
    db.prepare("DELETE FROM weekly_priorities WHERE id = ?").run(id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  notifyWrite();
  return true;
}

export function updateWeeklyReflection(weekKey, reflection) {
  const normalizedWeekKey = startOfIsoWeekKey(weekKey);
  if (!normalizedWeekKey) {
    return null;
  }

  const timestamp = nowIso();
  ensureWeeklyPlan(normalizedWeekKey, timestamp);
  db.prepare(`
    UPDATE weekly_plans
    SET reflection = ?, updated_at = ?
    WHERE week_key = ?
  `).run(reflection, timestamp, normalizedWeekKey);
  notifyWrite();

  return getWeeklyOverview(normalizedWeekKey);
}

export function exportGoalsForSync() {
  const daily = db
    .prepare(`
      SELECT id, date_key, time, text, done, is_daily_focus, weekly_priority_id,
        postponed_from_date, created_at, updated_at
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
      is_daily_focus: Boolean(task.is_daily_focus),
      weekly_priority_id: task.weekly_priority_id ?? null,
      postponed_from_date: task.postponed_from_date ?? null,
      created_at: task.created_at,
      updated_at: task.updated_at,
    }));

  const goals = db
    .prepare(`
      SELECT id, period, period_key, title, description, parent_goal_id, created_at, updated_at
      FROM goals
      ORDER BY period ASC, period_key ASC, created_at ASC
    `)
    .all();

  const subtasksStatement = db.prepare(`
    SELECT id, text, done, created_at, updated_at
    FROM checklist_items
    WHERE goal_id = ?
    ORDER BY created_at ASC, id ASC
  `);

  const monthly = [];
  const yearly = [];
  const weeklyPrioritiesStatement = db.prepare(`
    SELECT id, text, done, monthly_goal_id, created_at, updated_at
    FROM weekly_priorities
    WHERE week_key = ?
    ORDER BY created_at ASC, id ASC
  `);
  const weekly = db
    .prepare(`
      SELECT week_key, reflection, positive, improvement, custom_questions, question_set,
        completed_at, created_at, updated_at
      FROM weekly_plans
      ORDER BY week_key ASC
    `)
    .all()
    .map((plan) => ({
      id: plan.week_key,
      week: plan.week_key,
      reflection: plan.reflection ?? "",
      positive: plan.positive ?? "",
      improvement: plan.improvement ?? "",
      custom_questions: weeklyReviewQuestions(plan),
      questions: reviewQuestions(plan, weeklyReviewQuestions(plan)),
      completed_at: plan.completed_at ?? null,
      priorities: weeklyPrioritiesStatement.all(plan.week_key).map((priority) => ({
        id: priority.id,
        text: priority.text,
        done: Boolean(priority.done),
        monthly_goal_id: priority.monthly_goal_id ?? null,
        created_at: priority.created_at,
        updated_at: priority.updated_at,
      })),
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    }));

  const unassignedWeeklyPriorities = db
    .prepare(`
      SELECT id, text, done, monthly_goal_id, created_at, updated_at
      FROM weekly_priorities
      WHERE week_key IS NULL
      ORDER BY created_at ASC, id ASC
    `)
    .all()
    .map((priority) => ({
      id: priority.id,
      text: priority.text,
      done: Boolean(priority.done),
      monthly_goal_id: priority.monthly_goal_id,
      created_at: priority.created_at,
      updated_at: priority.updated_at,
    }));

  for (const goal of goals) {
    const sharedGoal = {
      id: goal.id,
      title: goal.title,
      description: goal.description ?? "",
      created_at: goal.created_at,
      updated_at: goal.updated_at,
    };

    if (goal.period === "monthly") {
      monthly.push({
        ...sharedGoal,
        month: goal.period_key || currentPeriodKey("monthly"),
        yearly_goal_id: goal.parent_goal_id ?? null,
      });
    } else {
      yearly.push({
        ...sharedGoal,
        year: goal.period_key || currentPeriodKey("yearly"),
        subtasks: subtasksStatement.all(goal.id).map((item) => ({
          id: item.id,
          text: item.text,
          done: Boolean(item.done),
          created_at: item.created_at,
          updated_at: item.updated_at,
        })),
      });
    }
  }

  const deleted = db
    .prepare(`
      SELECT entity_type AS type, entity_id AS id, deleted_at
      FROM sync_tombstones
      ORDER BY deleted_at ASC, entity_type ASC, entity_id ASC
    `)
    .all();

  const dailyReviews = db
    .prepare(`
      SELECT date_key, positive, improvement, custom_questions, question_set,
        completed_at, created_at, updated_at
      FROM daily_reviews
      ORDER BY date_key ASC
    `)
    .all()
    .map((review) => ({
      date: review.date_key,
      positive: review.positive ?? "",
      improvement: review.improvement ?? "",
      custom_questions: normalizeCustomQuestions(review.custom_questions),
      questions: reviewQuestions(review),
      completed_at: review.completed_at ?? null,
      created_at: review.created_at,
      updated_at: review.updated_at,
    }));

  return {
    daily,
    daily_reviews: dailyReviews,
    weekly,
    unassigned_weekly_priorities: unassignedWeeklyPriorities,
    monthly,
    yearly,
    deleted,
  };
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
      SELECT id, name, target_per_week, frequency_period, target_count,
        status, pause_start, pause_end, created_at, updated_at
      FROM habits
      ORDER BY created_at ASC, id ASC
    `)
    .all()
    .map((habit) => ({
      id: habit.id,
      name: habit.name,
      target_per_week: habit.target_per_week,
      frequency_period: normalizeFrequencyPeriod(habit.frequency_period),
      target_count: normalizeHabitTarget(
        habit.frequency_period,
        habit.target_count ?? habit.target_per_week
      ),
      status: habit.status === "paused" ? "paused" : "active",
      pause_start: habit.pause_start ?? null,
      pause_end: habit.pause_end ?? null,
      completions: completionsStatement.all(habit.id).map((completion) => completion.date),
      created_at: habit.created_at,
      updated_at: habit.updated_at,
    }));

  return { habits };
}

export function importGoalsFromSync(syncData) {
  let pulled = 0;
  const daily = Array.isArray(syncData?.daily) ? syncData.daily : [];
  const dailyReviews = Array.isArray(syncData?.daily_reviews) ? syncData.daily_reviews : [];
  const weekly = Array.isArray(syncData?.weekly) ? syncData.weekly : [];
  const unassignedWeeklyPriorities = Array.isArray(syncData?.unassigned_weekly_priorities)
    ? syncData.unassigned_weekly_priorities
    : [];
  const monthly = Array.isArray(syncData?.monthly) ? syncData.monthly : [];
  const yearly = Array.isArray(syncData?.yearly) ? syncData.yearly : [];
  const deleted = Array.isArray(syncData?.deleted) ? syncData.deleted : [];

  db.exec("BEGIN");
  try {
    pulled += importGoalsByPeriod("yearly", yearly);
    pulled += importGoalsByPeriod("monthly", monthly);
    pulled += importUnassignedWeeklyPriorities(unassignedWeeklyPriorities);
    pulled += importWeeklyPlans(weekly);
    pulled += importDailyTasks(daily);
    pulled += importDailyReviews(dailyReviews);
    pulled += importTombstones(deleted);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return pulled;
}

function importUnassignedWeeklyPriorities(priorities) {
  let pulled = 0;
  const insertPriority = db.prepare(`
    INSERT INTO weekly_priorities
      (id, week_key, text, done, monthly_goal_id, created_at, updated_at)
    VALUES (?, NULL, ?, ?, ?, ?, ?)
  `);
  const updatePriority = db.prepare(`
    UPDATE weekly_priorities
    SET week_key = NULL, text = ?, done = ?, monthly_goal_id = ?, updated_at = ?
    WHERE id = ?
  `);

  for (const priority of priorities) {
    if (!priority?.id || typeof priority.text !== "string" || !priority.text.trim()) {
      continue;
    }
    const updatedAt = priority.updated_at || nowIso();
    const current = getWeeklyPriorityStatement.get(priority.id);
    if (!liveEntryWins("weekly_priority", priority.id, updatedAt)) {
      continue;
    }
    const parentId = safeRemoteRelation(
      () => validatePriorityParent(null, priority.monthly_goal_id),
      `unassigned weekly priority ${priority.id}`
    );
    const values = [
      priority.text.trim(),
      priority.done ? 1 : 0,
      parentId,
      updatedAt,
    ];
    if (!current) {
      insertPriority.run(
        priority.id,
        priority.text.trim(),
        priority.done ? 1 : 0,
        parentId,
        priority.created_at || updatedAt,
        updatedAt
      );
      pulled += 1;
    } else if (isJsonNewer(updatedAt, current.updated_at)) {
      updatePriority.run(...values, priority.id);
      pulled += 1;
    }
  }
  return pulled;
}

function importDailyReviews(reviews) {
  let pulled = 0;
  const insertReview = db.prepare(`
    INSERT INTO daily_reviews
      (date_key, positive, improvement, custom_questions, question_set,
        completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateReview = db.prepare(`
    UPDATE daily_reviews
    SET positive = ?, improvement = ?, custom_questions = ?, question_set = ?,
      completed_at = ?, updated_at = ?
    WHERE date_key = ?
  `);

  for (const review of reviews) {
    if (!isDateKey(review?.date)) continue;
    const updatedAt = review.updated_at || nowIso();
    const current = getDailyReviewStatement.get(review.date);
    if (current && !isJsonNewer(updatedAt, current.updated_at)) continue;
    const positive = typeof review.positive === "string" ? review.positive : "";
    const improvement = typeof review.improvement === "string" ? review.improvement : "";
    const customQuestions = JSON.stringify(normalizeCustomQuestions(review.custom_questions));
    const questionSet = Array.isArray(review.questions)
      ? JSON.stringify(normalizeReviewQuestions(review.questions))
      : current?.question_set ?? null;
    const completedAt = typeof review.completed_at === "string" ? review.completed_at : null;

    if (current) {
      updateReview.run(
        positive,
        improvement,
        customQuestions,
        questionSet,
        completedAt,
        updatedAt,
        review.date
      );
    } else {
      insertReview.run(
        review.date,
        positive,
        improvement,
        customQuestions,
        questionSet,
        completedAt,
        review.created_at || updatedAt,
        updatedAt
      );
    }
    pulled += 1;
  }
  return pulled;
}

function safeRemoteRelation(resolve, label) {
  try {
    return resolve();
  } catch (error) {
    console.warn(`Ungueltige Zielverknuepfung in goals.json (${label}): ${error.message}`);
    return null;
  }
}

function importDailyTasks(tasks) {
  let pulled = 0;
  const insertDaily = db.prepare(`
    INSERT INTO daily_tasks
      (id, date_key, time, text, done, is_daily_focus, weekly_priority_id,
        postponed_from_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateDaily = db.prepare(`
    UPDATE daily_tasks
    SET date_key = ?, time = ?, text = ?, done = ?, is_daily_focus = ?,
      weekly_priority_id = ?, postponed_from_date = ?, updated_at = ?
    WHERE id = ?
  `);

  for (const task of tasks) {
    if (!task?.id || !isDateKey(task.date) || typeof task.text !== "string") {
      continue;
    }
    const current = getDailyTaskStatement.get(task.id);
    const updatedAt = task.updated_at || nowIso();
    const createdAt = task.created_at || updatedAt;
    if (!liveEntryWins("daily_task", task.id, updatedAt)) {
      continue;
    }
    let time = "00:00";
    if (hasOwn(task, "time")) {
      if (task.time === "" || task.time === null) {
        time = "";
      } else if (typeof task.time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.time)) {
        time = task.time;
      } else {
        console.warn(`Ungueltiger time-Wert in goals.json fuer daily task ${task.id}: ${task.time}`);
      }
    } else if (task.hour !== undefined && task.hour !== null) {
      time = timeFromHour(task.hour);
    }
    const parentId = hasOwn(task, "weekly_priority_id")
      ? safeRemoteRelation(
          () => validateTaskParent(task.date, task.weekly_priority_id),
          `daily ${task.id}`
        )
      : current?.weekly_priority_id ?? null;
    const isDailyFocus = hasOwn(task, "is_daily_focus")
      ? Boolean(task.is_daily_focus)
      : Boolean(current?.is_daily_focus);
    let postponedFromDate = current?.postponed_from_date ?? null;
    if (hasOwn(task, "postponed_from_date")) {
      if (task.postponed_from_date === null || task.postponed_from_date === "") {
        postponedFromDate = null;
      } else if (isDateKey(task.postponed_from_date) && task.postponed_from_date < task.date) {
        postponedFromDate = task.postponed_from_date;
      } else {
        postponedFromDate = null;
        console.warn(`Ungueltiger postponed_from_date-Wert in goals.json fuer daily task ${task.id}: ${task.postponed_from_date}`);
      }
    }
    const values = [
      task.date,
      time,
      task.text,
      task.done ? 1 : 0,
      isDailyFocus ? 1 : 0,
      parentId,
      postponedFromDate,
      updatedAt,
    ];

    if (!current) {
      insertDaily.run(
        task.id,
        task.date,
        time,
        task.text,
        task.done ? 1 : 0,
        isDailyFocus ? 1 : 0,
        parentId,
        postponedFromDate,
        createdAt,
        updatedAt
      );
      pulled += 1;
    } else if (isJsonNewer(updatedAt, current.updated_at)) {
      updateDaily.run(...values, task.id);
      pulled += 1;
    }
  }
  return pulled;
}

function importWeeklyPlans(plans) {
  let pulled = 0;
  const insertPlan = db.prepare(`
    INSERT INTO weekly_plans
      (week_key, reflection, positive, improvement, custom_questions, question_set,
        completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updatePlan = db.prepare(`
    UPDATE weekly_plans
    SET reflection = ?, positive = ?, improvement = ?, custom_questions = ?,
      question_set = ?, completed_at = ?, updated_at = ?
    WHERE week_key = ?
  `);
  const insertPriority = db.prepare(`
    INSERT INTO weekly_priorities
      (id, week_key, text, done, monthly_goal_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updatePriority = db.prepare(`
    UPDATE weekly_priorities
    SET week_key = ?, text = ?, done = ?, monthly_goal_id = ?, updated_at = ?
    WHERE id = ?
  `);

  for (const plan of plans) {
    const weekKey = startOfIsoWeekKey(plan?.week ?? plan?.id);
    if (!weekKey) {
      continue;
    }

    const updatedAt = plan.updated_at || nowIso();
    const createdAt = plan.created_at || updatedAt;
    const reflection = typeof plan.reflection === "string" ? plan.reflection : "";
    const currentPlan = getWeeklyPlanStatement.get(weekKey);
    const hasReview = hasOwn(plan, "positive")
      || hasOwn(plan, "improvement")
      || hasOwn(plan, "custom_questions")
      || hasOwn(plan, "questions")
      || hasOwn(plan, "completed_at");
    const positive = hasReview
      ? (typeof plan.positive === "string" ? plan.positive : "")
      : currentPlan?.positive ?? "";
    const improvement = hasReview
      ? (typeof plan.improvement === "string" ? plan.improvement : "")
      : currentPlan?.improvement ?? "";
    const customQuestions = hasReview
      ? JSON.stringify(normalizeCustomQuestions(plan.custom_questions))
      : currentPlan?.custom_questions ?? "[]";
    const questionSet = Array.isArray(plan.questions)
      ? JSON.stringify(normalizeReviewQuestions(plan.questions))
      : currentPlan?.question_set ?? null;
    const completedAt = hasReview
      ? (typeof plan.completed_at === "string" ? plan.completed_at : null)
      : currentPlan?.completed_at ?? null;

    if (!currentPlan) {
      insertPlan.run(
        weekKey,
        reflection,
        positive,
        improvement,
        customQuestions,
        questionSet,
        completedAt,
        createdAt,
        updatedAt
      );
      pulled += 1;
    } else if (isJsonNewer(updatedAt, currentPlan.updated_at)) {
      updatePlan.run(
        typeof plan.reflection === "string" ? plan.reflection : currentPlan.reflection,
        positive,
        improvement,
        customQuestions,
        questionSet,
        completedAt,
        updatedAt,
        weekKey
      );
      pulled += 1;
    }

    const priorities = Array.isArray(plan.priorities) ? plan.priorities : [];
    for (const priority of priorities) {
      if (!priority?.id || typeof priority.text !== "string" || !priority.text.trim()) {
        continue;
      }

      const priorityUpdatedAt = priority.updated_at || updatedAt;
      const priorityCreatedAt = priority.created_at || priorityUpdatedAt;
      const currentPriority = getWeeklyPriorityStatement.get(priority.id);
      if (!liveEntryWins("weekly_priority", priority.id, priorityUpdatedAt)) {
        continue;
      }
      const done = priority.done ? 1 : 0;
      const parentId = hasOwn(priority, "monthly_goal_id")
        ? safeRemoteRelation(
            () => validatePriorityParent(weekKey, priority.monthly_goal_id),
            `weekly priority ${priority.id}`
          )
        : currentPriority?.monthly_goal_id ?? null;

      if (!currentPriority) {
        insertPriority.run(
          priority.id,
          weekKey,
          priority.text.trim(),
          done,
          parentId,
          priorityCreatedAt,
          priorityUpdatedAt
        );
        pulled += 1;
      } else if (isJsonNewer(priorityUpdatedAt, currentPriority.updated_at)) {
        updatePriority.run(
          weekKey,
          priority.text.trim(),
          done,
          parentId,
          priorityUpdatedAt,
          priority.id
        );
        pulled += 1;
      }
    }
  }

  return pulled;
}

function importTombstones(tombstones) {
  let pulled = 0;
  const supportedTypes = new Set(["daily_task", "weekly_priority", "goal", "checklist_item"]);

  for (const tombstone of tombstones) {
    if (!tombstone?.id || !supportedTypes.has(tombstone.type)) {
      continue;
    }
    const deletedAt = tombstone.deleted_at || nowIso();
    const existingTombstone = db
      .prepare("SELECT deleted_at FROM sync_tombstones WHERE entity_type = ? AND entity_id = ?")
      .get(tombstone.type, tombstone.id);
    if (existingTombstone && !isJsonNewer(deletedAt, existingTombstone.deleted_at)) {
      continue;
    }

    let current = null;
    if (tombstone.type === "daily_task") current = getDailyTaskStatement.get(tombstone.id);
    if (tombstone.type === "weekly_priority") current = getWeeklyPriorityStatement.get(tombstone.id);
    if (tombstone.type === "goal") current = getGoalStatement.get(tombstone.id);
    if (tombstone.type === "checklist_item") current = getChecklistItemStatement.get(tombstone.id);
    if (current && isJsonNewer(current.updated_at, deletedAt)) {
      continue;
    }

    if (tombstone.type === "weekly_priority") {
      db.prepare(`
        UPDATE daily_tasks
        SET weekly_priority_id = NULL, updated_at = ?
        WHERE weekly_priority_id = ?
      `).run(deletedAt, tombstone.id);
      db.prepare("DELETE FROM weekly_priorities WHERE id = ?").run(tombstone.id);
    } else if (tombstone.type === "goal") {
      if (current?.period === "yearly") {
        db.prepare(`
          UPDATE goals SET parent_goal_id = NULL, updated_at = ? WHERE parent_goal_id = ?
        `).run(deletedAt, tombstone.id);
      } else {
        db.prepare(`
          UPDATE weekly_priorities
          SET monthly_goal_id = NULL, updated_at = ?
          WHERE monthly_goal_id = ?
        `).run(deletedAt, tombstone.id);
      }
      db.prepare("DELETE FROM goals WHERE id = ?").run(tombstone.id);
    } else if (tombstone.type === "daily_task") {
      db.prepare("DELETE FROM daily_tasks WHERE id = ?").run(tombstone.id);
    } else {
      db.prepare("DELETE FROM checklist_items WHERE id = ?").run(tombstone.id);
    }

    recordTombstone(tombstone.type, tombstone.id, deletedAt);
    pulled += 1;
  }
  return pulled;
}

export function importHabitsFromSync(syncData) {
  let pulled = 0;
  const habits = Array.isArray(syncData?.habits) ? syncData.habits : [];

  db.exec("BEGIN");
  try {
    const insertHabit = db.prepare(`
      INSERT INTO habits
        (id, name, target_per_week, frequency_period, target_count,
          status, pause_start, pause_end, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateHabitFromSync = db.prepare(`
      UPDATE habits
      SET name = ?, target_per_week = ?, frequency_period = ?, target_count = ?,
        status = ?, pause_start = ?, pause_end = ?, updated_at = ?
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
      const hasFrequency = "frequency_period" in habit || "target_count" in habit;
      const frequencyPeriod = hasFrequency
        ? normalizeFrequencyPeriod(habit.frequency_period)
        : normalizeFrequencyPeriod(current?.frequency_period);
      const targetCount = hasFrequency
        ? normalizeHabitTarget(frequencyPeriod, habit.target_count ?? habit.target_per_week)
        : normalizeHabitTarget(
            frequencyPeriod,
            current?.target_count ?? habit.target_per_week
          );
      let pause;
      try {
        pause = normalizeHabitPause(
          habit.status,
          habit.pause_start,
          habit.pause_end
        );
      } catch {
        pause = { status: "active", pauseStart: null, pauseEnd: null };
      }

      if (!current) {
        insertHabit.run(
          habit.id,
          habit.name,
          targetPerWeek,
          frequencyPeriod,
          targetCount,
          pause.status,
          pause.pauseStart,
          pause.pauseEnd,
          createdAt,
          updatedAt
        );
        pulled += 1;
      } else if (isJsonNewer(updatedAt, current.updated_at)) {
        if (!("status" in habit) && !("pause_start" in habit) && !("pause_end" in habit)) {
          pause = {
            status: current.status,
            pauseStart: current.pause_start,
            pauseEnd: current.pause_end,
          };
        }
        updateHabitFromSync.run(
          habit.name,
          targetPerWeek,
          frequencyPeriod,
          targetCount,
          pause.status,
          pause.pauseStart,
          pause.pauseEnd,
          updatedAt,
          habit.id
        );
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
    INSERT INTO goals
      (id, period, period_key, title, description, parent_goal_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateGoalFromSync = db.prepare(`
    UPDATE goals
    SET period = ?, period_key = ?, title = ?, description = ?, parent_goal_id = ?, updated_at = ?
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
  const insertLegacyMonthlyPriority = db.prepare(`
    INSERT INTO weekly_priorities
      (id, week_key, text, done, monthly_goal_id, created_at, updated_at)
    VALUES (?, NULL, ?, ?, ?, ?, ?)
  `);
  const updateLegacyMonthlyPriority = db.prepare(`
    UPDATE weekly_priorities
    SET text = ?, done = ?, monthly_goal_id = ?, updated_at = ?
    WHERE id = ?
  `);

  for (const goal of goals) {
    if (!goal?.id || typeof goal.title !== "string") {
      continue;
    }

    const periodKey = period === "monthly" ? goal.month : goal.year;
    const updatedAt = goal.updated_at || nowIso();
    const current = getGoalStatement.get(goal.id);
    if (!liveEntryWins("goal", goal.id, updatedAt)) {
      continue;
    }
    const description =
      typeof goal.description === "string" ? goal.description : current?.description ?? "";
    let targetPeriodKey;
    try {
      targetPeriodKey = validatePeriodKey(
        period,
        periodKey || current?.period_key || currentPeriodKey(period)
      );
    } catch (error) {
      console.warn(`Ungueltiger Zielzeitraum in goals.json (${goal.id}): ${error.message}`);
      continue;
    }
    const parentId = period === "monthly" && hasOwn(goal, "yearly_goal_id")
      ? safeRemoteRelation(
          () => validateGoalParent(period, targetPeriodKey, goal.yearly_goal_id),
          `monthly goal ${goal.id}`
        )
      : current?.parent_goal_id ?? null;

    if (!current) {
      const createdAt = goal.created_at || updatedAt;
      insertGoal.run(
        goal.id,
        period,
        targetPeriodKey,
        goal.title,
        description,
        parentId,
        createdAt,
        updatedAt
      );
      pulled += 1;
    } else if (isJsonNewer(updatedAt, current.updated_at)) {
      updateGoalFromSync.run(
        period,
        targetPeriodKey,
        goal.title,
        description,
        parentId,
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
      const itemCreatedAt = item.created_at || itemUpdatedAt;

      if (period === "monthly") {
        if (!liveEntryWins("checklist_item", item.id, itemUpdatedAt)) {
          continue;
        }
        const currentPriority = getWeeklyPriorityStatement.get(item.id);
        if (!currentPriority) {
          insertLegacyMonthlyPriority.run(
            item.id,
            item.text,
            item.done ? 1 : 0,
            goal.id,
            itemCreatedAt,
            itemUpdatedAt
          );
          pulled += 1;
        } else if (isJsonNewer(itemUpdatedAt, currentPriority.updated_at)) {
          updateLegacyMonthlyPriority.run(
            item.text,
            item.done ? 1 : 0,
            goal.id,
            itemUpdatedAt,
            item.id
          );
          pulled += 1;
        }
        db.prepare("DELETE FROM checklist_items WHERE id = ?").run(item.id);
        recordTombstone("checklist_item", item.id, itemUpdatedAt);
        continue;
      }

      const currentItem = getChecklistItemStatement.get(item.id);
      if (!liveEntryWins("checklist_item", item.id, itemUpdatedAt)) {
        continue;
      }
      const done = item.done ? 1 : 0;

      if (!currentItem) {
        insertItem.run(item.id, goal.id, item.text, done, itemCreatedAt, itemUpdatedAt);
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
        SELECT id, name, target_per_week, frequency_period, target_count,
          status, pause_start, pause_end, created_at, updated_at
        FROM habits
        ORDER BY created_at DESC, id DESC
      `)
      .all()
      .map((habit) => mapHabit(habit, getAllCompletionDatesForHabit(habit.id))),
  };
}

export function createHabit({ name, frequencyPeriod = "week", targetCount, targetPerWeek }) {
  const id = randomUUID();
  const timestamp = nowIso();
  const period = normalizeFrequencyPeriod(frequencyPeriod);
  const count = normalizeHabitTarget(period, targetCount ?? targetPerWeek);
  const legacyTarget = period === "week" ? count : 7;
  db.prepare(`
    INSERT INTO habits
      (id, name, target_per_week, frequency_period, target_count,
        status, pause_start, pause_end, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', NULL, NULL, ?, ?)
  `).run(id, name, legacyTarget, period, count, timestamp, timestamp);
  notifyWrite();

  return getHabitById(id);
}

export function updateHabit(id, patch) {
  const current = getHabitStatement.get(id);
  if (!current) {
    return null;
  }

  const pause = normalizeHabitPause(
    patch.status ?? current.status,
    Object.hasOwn(patch, "pauseStart") ? patch.pauseStart : current.pause_start,
    Object.hasOwn(patch, "pauseEnd") ? patch.pauseEnd : current.pause_end
  );
  const frequencyPeriod = normalizeFrequencyPeriod(
    patch.frequencyPeriod ?? current.frequency_period
  );
  const targetCount = normalizeHabitTarget(
    frequencyPeriod,
    Object.hasOwn(patch, "targetCount")
      ? patch.targetCount
      : Object.hasOwn(patch, "targetPerWeek")
        ? patch.targetPerWeek
        : current.target_count ?? current.target_per_week
  );
  const legacyTarget = frequencyPeriod === "week"
    ? targetCount
    : current.target_per_week;

  db.prepare(`
    UPDATE habits
    SET name = ?, target_per_week = ?, frequency_period = ?, target_count = ?,
      status = ?, pause_start = ?, pause_end = ?, updated_at = ?
    WHERE id = ?
  `).run(
    patch.name ?? current.name,
    legacyTarget,
    frequencyPeriod,
    targetCount,
    pause.status,
    pause.pauseStart,
    pause.pauseEnd,
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
  if (isHabitPausedOnDate(habit, date)) {
    const error = new Error("Dieser Habit ist an dem gewählten Tag pausiert.");
    error.status = 409;
    throw error;
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

export function saveDailyReview({
  dateKey,
  positive = "",
  improvement = "",
  customQuestions = [],
  questions,
  complete = false,
}) {
  if (!isDateKey(dateKey)) return null;
  const current = getDailyReviewStatement.get(dateKey);
  const timestamp = nowIso();
  const completedAt = complete ? (current?.completed_at || timestamp) : null;
  const normalizedQuestions = Array.isArray(questions)
    ? normalizeReviewQuestions(questions)
    : legacyReviewQuestions({ positive, improvement, custom_questions: customQuestions });
  const positiveAnswer = normalizedQuestions.find((item) => item.kind === "positive")?.answer ?? "";
  const improvementAnswer = normalizedQuestions.find((item) => item.kind === "improvement")?.answer ?? "";
  const serializedCustomQuestions = JSON.stringify(
    normalizedQuestions.filter((item) => item.kind === "custom")
  );
  const serializedQuestionSet = JSON.stringify(normalizedQuestions);

  db.prepare(`
    INSERT INTO daily_reviews
      (date_key, positive, improvement, custom_questions, question_set,
        completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date_key) DO UPDATE SET
      positive = excluded.positive,
      improvement = excluded.improvement,
      custom_questions = excluded.custom_questions,
      question_set = excluded.question_set,
      completed_at = excluded.completed_at,
      updated_at = excluded.updated_at
  `).run(
    dateKey,
    positiveAnswer,
    improvementAnswer,
    serializedCustomQuestions,
    serializedQuestionSet,
    completedAt,
    current?.created_at || timestamp,
    timestamp
  );
  notifyWrite();
  return mapDailyReview(getDailyReviewStatement.get(dateKey));
}

export function saveWeeklyReview({
  weekKey,
  positive = "",
  improvement = "",
  customQuestions = [],
  questions,
  complete = false,
}) {
  const normalizedWeekKey = startOfIsoWeekKey(weekKey);
  if (!normalizedWeekKey) return null;
  const timestamp = nowIso();
  ensureWeeklyPlan(normalizedWeekKey, timestamp);
  const current = getWeeklyPlanStatement.get(normalizedWeekKey);
  const completedAt = current?.completed_at || (complete ? timestamp : null);
  const normalizedQuestions = Array.isArray(questions)
    ? normalizeReviewQuestions(questions)
    : legacyReviewQuestions({ positive, improvement, custom_questions: customQuestions });
  const positiveAnswer = normalizedQuestions.find((item) => item.kind === "positive")?.answer ?? "";
  const improvementAnswer = normalizedQuestions.find((item) => item.kind === "improvement")?.answer ?? "";
  db.prepare(`
    UPDATE weekly_plans
    SET reflection = '', positive = ?, improvement = ?, custom_questions = ?,
      question_set = ?, completed_at = ?, updated_at = ?
    WHERE week_key = ?
  `).run(
    positiveAnswer,
    improvementAnswer,
    JSON.stringify(normalizedQuestions.filter((item) => item.kind === "custom")),
    JSON.stringify(normalizedQuestions),
    completedAt,
    timestamp,
    normalizedWeekKey
  );
  notifyWrite();
  return mapWeeklyReview(getWeeklyPlanStatement.get(normalizedWeekKey));
}

export function createDailyTask({
  dateKey,
  time = "",
  text,
  weeklyPriorityId = null,
  isDailyFocus = false,
}) {
  const id = randomUUID();
  const timestamp = nowIso();
  const parentId = validateTaskParent(dateKey, weeklyPriorityId);
  db.prepare(`
    INSERT INTO daily_tasks
      (id, date_key, time, text, done, is_daily_focus, weekly_priority_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
  `).run(id, dateKey, time, text, isDailyFocus ? 1 : 0, parentId, timestamp, timestamp);
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
    isDailyFocus: typeof patch.isDailyFocus === "boolean"
      ? patch.isDailyFocus
      : Boolean(current.is_daily_focus),
    weeklyPriorityId: hasOwn(patch, "weeklyPriorityId")
      ? validateTaskParent(current.date_key, patch.weeklyPriorityId)
      : current.weekly_priority_id,
  };

  db.prepare(`
    UPDATE daily_tasks
    SET time = ?, text = ?, done = ?, is_daily_focus = ?, weekly_priority_id = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.time,
    next.text,
    next.done ? 1 : 0,
    next.isDailyFocus ? 1 : 0,
    next.weeklyPriorityId,
    nowIso(),
    id
  );
  notifyWrite();

  return mapDailyTask(getDailyTaskStatement.get(id));
}

export function carryOverIncompleteDailyTasks({ fromDateKey, toDateKey }) {
  if (!isDateKey(fromDateKey) || !isDateKey(toDateKey) || addDaysToDateKey(fromDateKey, 1) !== toDateKey) {
    const error = new Error("Aufgaben können nur auf den unmittelbar folgenden Tag verschoben werden.");
    error.status = 400;
    throw error;
  }

  const review = getDailyReviewStatement.get(fromDateKey);
  if (!review?.completed_at) {
    const error = new Error("Der Vortag muss abgeschlossen sein, bevor Aufgaben übernommen werden können.");
    error.status = 409;
    throw error;
  }

  const tasks = db.prepare(`
    SELECT id, weekly_priority_id, postponed_from_date
    FROM daily_tasks
    WHERE date_key = ? AND done = 0
    ORDER BY time ASC, created_at ASC, id ASC
  `).all(fromDateKey);

  if (!tasks.length) {
    return [];
  }

  const targetWeekKey = startOfIsoWeekKey(toDateKey);
  const timestamp = nowIso();
  const update = db.prepare(`
    UPDATE daily_tasks
    SET date_key = ?, weekly_priority_id = ?, postponed_from_date = ?, updated_at = ?
    WHERE id = ?
  `);

  db.exec("BEGIN");
  try {
    for (const task of tasks) {
      const parent = task.weekly_priority_id
        ? getWeeklyPriorityStatement.get(task.weekly_priority_id)
        : null;
      const parentId = parent?.week_key === targetWeekKey ? task.weekly_priority_id : null;
      const postponedFromDate = task.postponed_from_date || fromDateKey;
      update.run(toDateKey, parentId, postponedFromDate, timestamp, task.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  notifyWrite();
  return tasks.map((task) => mapDailyTask(getDailyTaskStatement.get(task.id)));
}

export function deleteDailyTask(id) {
  if (!getDailyTaskStatement.get(id)) {
    return false;
  }
  const timestamp = nowIso();
  recordTombstone("daily_task", id, timestamp);
  db.prepare("DELETE FROM daily_tasks WHERE id = ?").run(id);
  notifyWrite();
  return true;
}

export function createGoal({ period, periodKey, title, description, parentGoalId = null }) {
  const id = randomUUID();
  const timestamp = nowIso();
  const targetPeriodKey = validatePeriodKey(period, periodKey || currentPeriodKey(period));
  const parentId = validateGoalParent(period, targetPeriodKey, parentGoalId);
  db.prepare(`
    INSERT INTO goals
      (id, period, period_key, title, description, parent_goal_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, period, targetPeriodKey, title, description ?? "", parentId, timestamp, timestamp);
  notifyWrite();

  return getGoalById(id);
}

export function updateGoal(id, patch) {
  const current = getGoalStatement.get(id);
  if (!current) {
    return null;
  }

  const timestamp = nowIso();
  const periodKey = validatePeriodKey(current.period, patch.periodKey ?? current.period_key);
  const parentId = hasOwn(patch, "parentGoalId")
    ? validateGoalParent(current.period, periodKey, patch.parentGoalId)
    : validateGoalParent(current.period, periodKey, current.parent_goal_id);

  db.exec("BEGIN");
  try {
    db.prepare(`
    UPDATE goals
    SET period_key = ?, title = ?, description = ?, parent_goal_id = ?, updated_at = ?
    WHERE id = ?
    `).run(
      periodKey,
      patch.title ?? current.title,
      patch.description ?? current.description,
      parentId,
      timestamp,
      id
    );

    if (current.period === "yearly") {
      db.prepare(`
        UPDATE goals
        SET parent_goal_id = NULL, updated_at = ?
        WHERE parent_goal_id = ? AND substr(period_key, 1, 4) <> ?
      `).run(timestamp, id, periodKey);
    } else {
      for (const priority of db.prepare(`
        SELECT id, week_key FROM weekly_priorities WHERE monthly_goal_id = ?
      `).all(id)) {
        if (priority.week_key && !weekMonthKeys(priority.week_key).includes(periodKey)) {
          db.prepare(`
            UPDATE weekly_priorities
            SET monthly_goal_id = NULL, updated_at = ?
            WHERE id = ?
          `).run(timestamp, priority.id);
        }
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  notifyWrite();

  return getGoalById(id);
}

export function deleteGoal(id) {
  const current = getGoalStatement.get(id);
  if (!current) {
    return false;
  }
  const timestamp = nowIso();
  db.exec("BEGIN");
  try {
    if (current.period === "yearly") {
      db.prepare(`
        UPDATE goals SET parent_goal_id = NULL, updated_at = ? WHERE parent_goal_id = ?
      `).run(timestamp, id);
    } else {
      db.prepare(`
        UPDATE weekly_priorities
        SET monthly_goal_id = NULL, updated_at = ?
        WHERE monthly_goal_id = ?
      `).run(timestamp, id);
    }
    recordTombstone("goal", id, timestamp);
    db.prepare("DELETE FROM goals WHERE id = ?").run(id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  notifyWrite();
  return true;
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
  if (!getChecklistItemStatement.get(id)) {
    return false;
  }
  recordTombstone("checklist_item", id);
  db.prepare("DELETE FROM checklist_items WHERE id = ?").run(id);
  notifyWrite();
  return true;
}
