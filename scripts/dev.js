import { spawn } from "node:child_process";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const viteBin = resolve(rootDir, "node_modules", ".bin", "vite");
const apiPort = process.env.API_PORT || process.env.PORT || "5174";
const clientPort = process.env.CLIENT_PORT || "5173";

const children = [
  spawn(process.execPath, ["server/index.js"], {
    cwd: rootDir,
    env: { ...process.env, PORT: apiPort },
    stdio: "inherit",
  }),
  spawn(viteBin, ["--host", "127.0.0.1", "--port", clientPort], {
    cwd: rootDir,
    env: { ...process.env, API_PORT: apiPort },
    stdio: "inherit",
  }),
];

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (!shuttingDown && code !== 0 && signal !== "SIGTERM") {
      shutdown(code ?? 1);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
