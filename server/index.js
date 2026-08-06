import express from "express";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  carryOverIncompleteDailyTasks,
  createChecklistItem,
  createDailyTask,
  createGoal,
  createHabit,
  createWeeklyPriority,
  deleteChecklistItem,
  deleteDailyTask,
  deleteGoal,
  deleteHabit,
  deleteWeeklyPriority,
  getDatabasePath,
  getState,
  getWeeklyOverview,
  listHabits,
  saveDailyReview,
  saveWeeklyReview,
  setDatabaseWriteListener,
  toggleHabitCompletion,
  updateChecklistItem,
  updateDailyTask,
  updateGoal,
  updateHabit,
  updateWeeklyPriority,
  updateWeeklyReflection,
} from "./database.js";
import { GIT_REPO_PATH, runManualSync, scheduleExportToGit, syncFromGitHub } from "./git-sync.js";

const app = express();
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(rootDir, "dist");
const port = Number(process.env.PORT ?? 5174);

app.use(express.json({ limit: "1mb" }));

function stringField(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${fieldName} ist erforderlich.`);
    error.status = 400;
    throw error;
  }
  return value.trim();
}

function optionalStringField(value) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalTimeField(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    const error = new Error("time muss leer sein oder dem Format HH:MM entsprechen.");
    error.status = 400;
    throw error;
  }
  return value;
}

function boolField(value, fieldName) {
  if (typeof value !== "boolean") {
    const error = new Error(`${fieldName} muss true oder false sein.`);
    error.status = 400;
    throw error;
  }
  return value;
}

function targetPerWeekField(value, fieldName = "targetPerWeek") {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 7) {
    const error = new Error(`${fieldName} muss eine Zahl zwischen 1 und 7 sein.`);
    error.status = 400;
    throw error;
  }
  return number;
}

function frequencyPeriodField(value) {
  if (value !== "day" && value !== "week" && value !== "month") {
    const error = new Error("frequencyPeriod muss day, week oder month sein.");
    error.status = 400;
    throw error;
  }
  return value;
}

function targetCountField(value, frequencyPeriod) {
  if (frequencyPeriod === "day") return 1;
  const number = Number(value);
  const maximum = frequencyPeriod === "week" ? 7 : 31;
  if (!Number.isInteger(number) || number < 1 || number > maximum) {
    const error = new Error(`targetCount muss eine Zahl zwischen 1 und ${maximum} sein.`);
    error.status = 400;
    throw error;
  }
  return number;
}

function habitStatusField(value) {
  if (value !== "active" && value !== "paused") {
    const error = new Error("status muss active oder paused sein.");
    error.status = 400;
    throw error;
  }
  return value;
}

function dateKeyField(value, fieldName = "date") {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
    : null;
  const valid = date
    && date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3]);
  if (!valid) {
    const error = new Error(`${fieldName} muss im Format YYYY-MM-DD sein.`);
    error.status = 400;
    throw error;
  }
  return value;
}

function nullableDateKeyField(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return dateKeyField(value, fieldName);
}

function monthKeyField(value) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(value)) {
    const error = new Error("month muss im Format YYYY-MM sein.");
    error.status = 400;
    throw error;
  }
  return value;
}

function periodKeyField(period, value) {
  if (value === undefined) {
    return undefined;
  }
  const pattern = period === "monthly" ? /^\d{4}-(?:0[1-9]|1[0-2])$/ : /^\d{4}$/;
  if (typeof value !== "string" || !pattern.test(value)) {
    const error = new Error(
      `periodKey muss für ${period === "monthly" ? "Monatsziele YYYY-MM" : "Jahresziele YYYY"} entsprechen.`
    );
    error.status = 400;
    throw error;
  }
  return value;
}

function periodKeyUpdateField(value) {
  if (typeof value !== "string" || !/^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/.test(value)) {
    const error = new Error("periodKey muss YYYY oder YYYY-MM entsprechen.");
    error.status = 400;
    throw error;
  }
  return value;
}

function nullableIdField(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${fieldName} muss eine ID oder null sein.`);
    error.status = 400;
    throw error;
  }
  return value.trim();
}

function customQuestionsField(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    const error = new Error("customQuestions muss eine Liste sein.");
    error.status = 400;
    throw error;
  }
  return value.map((item) => {
    if (!item || typeof item.question !== "string" || !item.question.trim()) {
      const error = new Error("Jede eigene Frage benötigt einen Text.");
      error.status = 400;
      throw error;
    }
    return {
      id: typeof item.id === "string" ? item.id : "",
      question: item.question.trim(),
      answer: typeof item.answer === "string" ? item.answer.trim() : "",
    };
  });
}

function reviewQuestionsField(value) {
  if (value === undefined) return null;
  if (!Array.isArray(value)) {
    const error = new Error("questions muss eine Liste sein.");
    error.status = 400;
    throw error;
  }
  return value.map((item) => {
    if (!item || typeof item.question !== "string" || !item.question.trim()) {
      const error = new Error("Jede Review-Frage benötigt einen Text.");
      error.status = 400;
      throw error;
    }
    return {
      id: typeof item.id === "string" ? item.id : "",
      kind: item.kind === "positive" || item.kind === "improvement" ? item.kind : "custom",
      question: item.question.trim(),
      answer: typeof item.answer === "string" ? item.answer.trim() : "",
    };
  });
}

function dailyReviewAvailable(dateKey, now = new Date()) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return now >= new Date(year, month - 1, day, 19, 0, 0, 0);
}

function weeklyReviewAvailable(weekKey, now = new Date()) {
  const [year, month, day] = weekKey.split("-").map(Number);
  const weekStart = new Date(year, month - 1, day, 12);
  const weekday = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - weekday + 7);
  weekStart.setHours(19, 0, 0, 0);
  return now >= weekStart;
}

function habitTargetFromBody(body) {
  return body.targetPerWeek ?? body.target_per_week;
}

function habitFrequencyFromBody(body) {
  return body.frequencyPeriod ?? body.frequency_period ?? "week";
}

function habitTargetCountFromBody(body) {
  return body.targetCount ?? body.target_count ?? habitTargetFromBody(body);
}

function validatePeriod(period) {
  if (period !== "monthly" && period !== "yearly") {
    const error = new Error("period muss monthly oder yearly sein.");
    error.status = 400;
    throw error;
  }
  return period;
}

function sendNotFound(response) {
  response.status(404).json({ error: "Eintrag nicht gefunden." });
}

function asyncRoute(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response);
    } catch (error) {
      next(error);
    }
  };
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, database: getDatabasePath(), gitRepo: GIT_REPO_PATH });
});

app.get("/api/state", (_request, response) => {
  response.json(getState());
});

app.get("/api/weeks/:weekKey", asyncRoute((request, response) => {
  const overview = getWeeklyOverview(dateKeyField(request.params.weekKey, "weekKey"));
  if (!overview) {
    sendNotFound(response);
    return;
  }
  response.json(overview);
}));

app.post("/api/weeks/:weekKey/priorities", asyncRoute((request, response) => {
  const priority = createWeeklyPriority({
    weekKey: dateKeyField(request.params.weekKey, "weekKey"),
    text: stringField(request.body.text, "text"),
    monthlyGoalId: nullableIdField(request.body.monthlyGoalId, "monthlyGoalId"),
  });
  response.status(201).json(priority);
}));

app.post("/api/monthly-goals/:goalId/weekly-priorities", asyncRoute((request, response) => {
  const priority = createWeeklyPriority({
    weekKey: nullableDateKeyField(request.body.weekKey, "weekKey"),
    text: stringField(request.body.text, "text"),
    monthlyGoalId: request.params.goalId,
  });
  response.status(201).json(priority);
}));

app.patch("/api/weekly-priorities/:id", asyncRoute((request, response) => {
  const patch = {};
  if ("text" in request.body) {
    patch.text = stringField(request.body.text, "text");
  }
  if ("done" in request.body) {
    patch.done = boolField(request.body.done, "done");
  }
  if ("monthlyGoalId" in request.body) {
    patch.monthlyGoalId = nullableIdField(request.body.monthlyGoalId, "monthlyGoalId");
  }
  if ("weekKey" in request.body) {
    patch.weekKey = nullableDateKeyField(request.body.weekKey, "weekKey");
  }

  const priority = updateWeeklyPriority(request.params.id, patch);
  if (!priority) {
    sendNotFound(response);
    return;
  }
  response.json(priority);
}));

app.delete("/api/weekly-priorities/:id", (request, response) => {
  if (!deleteWeeklyPriority(request.params.id)) {
    sendNotFound(response);
    return;
  }
  response.status(204).end();
});

app.put("/api/weeks/:weekKey/reflection", asyncRoute((request, response) => {
  const overview = updateWeeklyReflection(
    dateKeyField(request.params.weekKey, "weekKey"),
    optionalStringField(request.body.reflection)
  );
  response.json(overview);
}));

app.put("/api/weeks/:weekKey/review", asyncRoute((request, response) => {
  const weekKey = dateKeyField(request.params.weekKey, "weekKey");
  if (!weeklyReviewAvailable(weekKey)) {
    const error = new Error("Der Wochenreview kann erst am Sonntag ab 19:00 Uhr ausgefüllt werden.");
    error.status = 403;
    throw error;
  }

  const positive = optionalStringField(request.body.positive);
  const improvement = optionalStringField(request.body.improvement);
  const customQuestions = customQuestionsField(request.body.customQuestions);
  const questions = reviewQuestionsField(request.body.questions);
  const complete = request.body.complete === true;
  const hasOpenQuestion = questions
    ? questions.some((item) => !item.answer)
    : (!positive || !improvement || customQuestions.some((item) => !item.answer));
  if (complete && hasOpenQuestion) {
    const error = new Error("Zum Abschließen müssen alle Fragen beantwortet sein.");
    error.status = 400;
    throw error;
  }

  response.json(saveWeeklyReview({
    weekKey,
    positive,
    improvement,
    customQuestions,
    questions,
    complete,
  }));
}));

app.post("/api/sync", asyncRoute(async (_request, response) => {
  response.json(await runManualSync());
}));

app.get("/api/habits", asyncRoute((request, response) => {
  response.json(listHabits(monthKeyField(request.query.month)));
}));

app.post("/api/habits", asyncRoute((request, response) => {
  const frequencyPeriod = frequencyPeriodField(habitFrequencyFromBody(request.body));
  const habit = createHabit({
    name: stringField(request.body.name, "name"),
    frequencyPeriod,
    targetCount: targetCountField(habitTargetCountFromBody(request.body), frequencyPeriod),
  });
  response.status(201).json(habit);
}));

app.put("/api/habits/:id", asyncRoute((request, response) => {
  const patch = {};
  if ("name" in request.body) {
    patch.name = stringField(request.body.name, "name");
  }
  if ("targetPerWeek" in request.body || "target_per_week" in request.body) {
    patch.frequencyPeriod = "week";
    patch.targetCount = targetPerWeekField(habitTargetFromBody(request.body));
  }
  if ("frequencyPeriod" in request.body || "frequency_period" in request.body) {
    patch.frequencyPeriod = frequencyPeriodField(habitFrequencyFromBody(request.body));
  }
  if ("targetCount" in request.body || "target_count" in request.body) {
    patch.targetCount = targetCountField(
      habitTargetCountFromBody(request.body),
      patch.frequencyPeriod
    );
  }
  if ("status" in request.body) {
    patch.status = habitStatusField(request.body.status);
  }
  if ("pauseStart" in request.body || "pause_start" in request.body) {
    patch.pauseStart = nullableDateKeyField(
      request.body.pauseStart ?? request.body.pause_start,
      "pauseStart"
    );
  }
  if ("pauseEnd" in request.body || "pause_end" in request.body) {
    patch.pauseEnd = nullableDateKeyField(
      request.body.pauseEnd ?? request.body.pause_end,
      "pauseEnd"
    );
  }

  const habit = updateHabit(request.params.id, patch);
  if (!habit) {
    sendNotFound(response);
    return;
  }
  response.json(habit);
}));

app.delete("/api/habits/:id", (request, response) => {
  if (!deleteHabit(request.params.id)) {
    sendNotFound(response);
    return;
  }
  response.status(204).end();
});

app.post("/api/habits/:id/toggle", asyncRoute((request, response) => {
  const habit = toggleHabitCompletion(request.params.id, dateKeyField(request.body.date));
  if (!habit) {
    sendNotFound(response);
    return;
  }
  response.json(habit);
}));

app.put("/api/daily-reviews/:dateKey", asyncRoute((request, response) => {
  const dateKey = dateKeyField(request.params.dateKey, "dateKey");
  if (!dailyReviewAvailable(dateKey)) {
    const error = new Error("Der Tagesreview kann erst ab 19:00 Uhr ausgefüllt werden.");
    error.status = 403;
    throw error;
  }

  const positive = optionalStringField(request.body.positive);
  const improvement = optionalStringField(request.body.improvement);
  const customQuestions = customQuestionsField(request.body.customQuestions);
  const questions = reviewQuestionsField(request.body.questions);
  const complete = request.body.complete === true;
  const hasOpenQuestion = questions
    ? questions.some((item) => !item.answer)
    : (!positive || !improvement || customQuestions.some((item) => !item.answer));
  if (complete && hasOpenQuestion) {
    const error = new Error("Zum Abschließen müssen alle Fragen beantwortet sein.");
    error.status = 400;
    throw error;
  }

  response.json(saveDailyReview({
    dateKey,
    positive,
    improvement,
    customQuestions,
    questions,
    complete,
  }));
}));

app.post("/api/daily-tasks", asyncRoute((request, response) => {
  const task = createDailyTask({
    dateKey: dateKeyField(request.body.dateKey, "dateKey"),
    time: optionalTimeField(request.body.time),
    text: stringField(request.body.text, "text"),
    weeklyPriorityId: nullableIdField(request.body.weeklyPriorityId, "weeklyPriorityId"),
    isDailyFocus: "isDailyFocus" in request.body
      ? boolField(request.body.isDailyFocus, "isDailyFocus")
      : false,
  });
  response.status(201).json(task);
}));

app.post("/api/daily-tasks/carry-over", asyncRoute((request, response) => {
  const tasks = carryOverIncompleteDailyTasks({
    fromDateKey: dateKeyField(request.body.fromDateKey, "fromDateKey"),
    toDateKey: dateKeyField(request.body.toDateKey, "toDateKey"),
  });
  response.json({ tasks });
}));

app.patch("/api/daily-tasks/:id", asyncRoute((request, response) => {
  const patch = {};
  if ("time" in request.body) {
    patch.time = optionalTimeField(request.body.time);
  }
  if ("text" in request.body) {
    patch.text = stringField(request.body.text, "text");
  }
  if ("done" in request.body) {
    patch.done = boolField(request.body.done, "done");
  }
  if ("isDailyFocus" in request.body) {
    patch.isDailyFocus = boolField(request.body.isDailyFocus, "isDailyFocus");
  }
  if ("weeklyPriorityId" in request.body) {
    patch.weeklyPriorityId = nullableIdField(request.body.weeklyPriorityId, "weeklyPriorityId");
  }

  const task = updateDailyTask(request.params.id, patch);
  if (!task) {
    sendNotFound(response);
    return;
  }
  response.json(task);
}));

app.delete("/api/daily-tasks/:id", (request, response) => {
  if (!deleteDailyTask(request.params.id)) {
    sendNotFound(response);
    return;
  }
  response.status(204).end();
});

app.post("/api/goals", asyncRoute((request, response) => {
  const period = validatePeriod(request.body.period);
  const goal = createGoal({
    period,
    periodKey: periodKeyField(period, request.body.periodKey),
    title: stringField(request.body.title, "title"),
    description: optionalStringField(request.body.description),
    parentGoalId: nullableIdField(request.body.parentGoalId, "parentGoalId"),
  });
  response.status(201).json(goal);
}));

app.patch("/api/goals/:id", asyncRoute((request, response) => {
  const patch = {
    title: "title" in request.body ? stringField(request.body.title, "title") : undefined,
    description: "description" in request.body ? optionalStringField(request.body.description) : undefined,
  };
  if ("periodKey" in request.body) {
    patch.periodKey = periodKeyUpdateField(request.body.periodKey);
  }
  if ("parentGoalId" in request.body) {
    patch.parentGoalId = nullableIdField(request.body.parentGoalId, "parentGoalId");
  }
  const goal = updateGoal(request.params.id, patch);
  if (!goal) {
    sendNotFound(response);
    return;
  }
  response.json(goal);
}));

app.delete("/api/goals/:id", (request, response) => {
  if (!deleteGoal(request.params.id)) {
    sendNotFound(response);
    return;
  }
  response.status(204).end();
});

app.post("/api/goals/:goalId/items", asyncRoute((request, response) => {
  const item = createChecklistItem(
    request.params.goalId,
    stringField(request.body.text, "text")
  );
  if (!item) {
    sendNotFound(response);
    return;
  }
  response.status(201).json(item);
}));

app.patch("/api/checklist-items/:id", asyncRoute((request, response) => {
  const patch = {};
  if ("text" in request.body) {
    patch.text = stringField(request.body.text, "text");
  }
  if ("done" in request.body) {
    patch.done = boolField(request.body.done, "done");
  }

  const item = updateChecklistItem(request.params.id, patch);
  if (!item) {
    sendNotFound(response);
    return;
  }
  response.json(item);
}));

app.delete("/api/checklist-items/:id", (request, response) => {
  if (!deleteChecklistItem(request.params.id)) {
    sendNotFound(response);
    return;
  }
  response.status(204).end();
});

if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((request, response, next) => {
    if (request.path.startsWith("/api")) {
      next();
      return;
    }
    response.sendFile(resolve(distDir, "index.html"));
  });
}

app.use((error, _request, response, _next) => {
  const status = error.status ?? 500;
  response.status(status).json({
    error: status === 500 ? "Serverfehler." : error.message,
  });
});

setDatabaseWriteListener(scheduleExportToGit);

syncFromGitHub()
  .then(({ pulled }) => {
    console.log(`Git-Sync beim Start abgeschlossen. Übernommen: ${pulled}`);
  })
  .catch((error) => {
    console.error(error.message);
  });

app.listen(port, "127.0.0.1", () => {
  console.log(`API läuft auf http://127.0.0.1:${port}`);
  console.log(`SQLite-Datei: ${getDatabasePath()}`);
  console.log(`Git-Repo: ${GIT_REPO_PATH}`);
});
