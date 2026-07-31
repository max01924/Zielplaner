import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { exportGoalsForSync, importGoalsFromSync } from "./database.js";

const execFileAsync = promisify(execFile);
const DEFAULT_GIT_REPO_PATH = "/Users/max/Goals";
const DEBOUNCE_MS = 5_000;

export const GIT_REPO_PATH = process.env.GIT_REPO_PATH || DEFAULT_GIT_REPO_PATH;
const goalsJsonPath = resolve(GIT_REPO_PATH, "goals.json");

let exportTimer = null;
let exportInFlight = Promise.resolve();

export class GitSyncError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "GitSyncError";
    this.status = 502;
    this.cause = cause;
  }
}

function logGitError(prefix, error) {
  const detail = error?.stderr || error?.stdout || error?.message || String(error);
  console.error(`${prefix}: ${detail}`);
}

async function runGit(args) {
  return execFileAsync("git", args, {
    cwd: GIT_REPO_PATH,
    maxBuffer: 1024 * 1024 * 10,
  });
}

function assertRepoAvailable() {
  if (!existsSync(GIT_REPO_PATH)) {
    throw new GitSyncError(`Git-Repo nicht gefunden: ${GIT_REPO_PATH}`);
  }
}

async function hasGoalsJsonChanges() {
  const { stdout } = await runGit(["status", "--porcelain", "--", "goals.json"]);
  return stdout.trim().length > 0;
}

async function branchIsAhead() {
  const { stdout } = await runGit(["status", "--porcelain", "--branch"]);
  return stdout.split("\n")[0]?.includes("[ahead");
}

async function pushGoalsJson() {
  await runGit(["add", "goals.json"]);

  if (await hasGoalsJsonChanges()) {
    await runGit(["commit", "-m", "Sync von App"]);
  } else if (!(await branchIsAhead())) {
    return false;
  }

  await runGit(["push"]);
  return true;
}

export function scheduleExportToGit() {
  clearTimeout(exportTimer);
  exportTimer = setTimeout(() => {
    exportInFlight = exportInFlight
      .then(() => exportAndPushNow({ throwOnError: false }))
      .catch((error) => {
        logGitError("Git-Sync fehlgeschlagen", error);
      });
  }, DEBOUNCE_MS);
}

export async function exportAndPushNow({ throwOnError = true } = {}) {
  clearTimeout(exportTimer);
  exportTimer = null;

  try {
    assertRepoAvailable();
    const payload = exportGoalsForSync();
    await writeFile(goalsJsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return { pushed: await pushGoalsJson() };
  } catch (error) {
    logGitError("Push fehlgeschlagen", error);
    if (throwOnError) {
      throw new GitSyncError(
        "Push fehlgeschlagen - eventuell ist der GitHub-Zugang abgelaufen oder keine Netzwerkverbindung vorhanden.",
        error
      );
    }
    return { pushed: false, error };
  }
}

export async function syncFromGitHub() {
  try {
    assertRepoAvailable();
    await runGit(["pull"]);

    if (!existsSync(goalsJsonPath)) {
      return { pulled: 0 };
    }

    const raw = await readFile(goalsJsonPath, "utf8");
    const parsed = JSON.parse(raw);
    return { pulled: importGoalsFromSync(parsed) };
  } catch (error) {
    logGitError("Pull fehlgeschlagen", error);
    if (error instanceof SyntaxError) {
      throw new GitSyncError("goals.json konnte nicht gelesen werden - JSON ist ungültig.", error);
    }
    throw new GitSyncError(
      "Pull fehlgeschlagen - eventuell ist der GitHub-Zugang abgelaufen oder keine Netzwerkverbindung vorhanden.",
      error
    );
  }
}

export async function runManualSync() {
  const { pulled } = await syncFromGitHub();
  const { pushed } = await exportAndPushNow({ throwOnError: true });
  return {
    pulled,
    pushed,
    timestamp: new Date().toISOString(),
  };
}
