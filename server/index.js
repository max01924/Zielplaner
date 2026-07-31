import express from "express";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createChecklistItem,
  createDailyTask,
  createGoal,
  deleteChecklistItem,
  deleteDailyTask,
  deleteGoal,
  getDatabasePath,
  getState,
  setDatabaseWriteListener,
  updateChecklistItem,
  updateDailyTask,
  updateGoal,
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

function boolField(value, fieldName) {
  if (typeof value !== "boolean") {
    const error = new Error(`${fieldName} muss true oder false sein.`);
    error.status = 400;
    throw error;
  }
  return value;
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

app.post("/api/sync", asyncRoute(async (_request, response) => {
  response.json(await runManualSync());
}));

app.post("/api/daily-tasks", asyncRoute((request, response) => {
  const task = createDailyTask({
    dateKey: stringField(request.body.dateKey, "dateKey"),
    time: stringField(request.body.time, "time"),
    text: stringField(request.body.text, "text"),
  });
  response.status(201).json(task);
}));

app.patch("/api/daily-tasks/:id", asyncRoute((request, response) => {
  const patch = {};
  if ("time" in request.body) {
    patch.time = stringField(request.body.time, "time");
  }
  if ("text" in request.body) {
    patch.text = stringField(request.body.text, "text");
  }
  if ("done" in request.body) {
    patch.done = boolField(request.body.done, "done");
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
  const goal = createGoal({
    period: validatePeriod(request.body.period),
    title: stringField(request.body.title, "title"),
    description: optionalStringField(request.body.description),
  });
  response.status(201).json(goal);
}));

app.patch("/api/goals/:id", asyncRoute((request, response) => {
  const goal = updateGoal(request.params.id, {
    title: "title" in request.body ? stringField(request.body.title, "title") : undefined,
    description: "description" in request.body ? optionalStringField(request.body.description) : undefined,
  });
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
