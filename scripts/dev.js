import { spawn } from "node:child_process";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const viteBin = resolve(rootDir, "node_modules", ".bin", "vite");

const children = [
  spawn(process.execPath, ["server/index.js"], {
    cwd: rootDir,
    env: { ...process.env, PORT: "5174" },
    stdio: "inherit",
  }),
  spawn(viteBin, ["--host", "127.0.0.1", "--port", "5173"], {
    cwd: rootDir,
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
