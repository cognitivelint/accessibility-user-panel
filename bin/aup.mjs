#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const compiled = join(root, "dist", "cli.js");
const source = join(root, "src", "cli.ts");
const tsx = join(root, "node_modules", "tsx", "dist", "cli.mjs");
const extra = process.argv.slice(2);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

let args;

if (existsSync(compiled)) {
  args = [compiled, ...extra];
} else if (existsSync(tsx) && existsSync(source)) {
  args = [tsx, source, ...extra];
} else {
  fail(
    "Cannot start AUP from source as plain Node (it will look for src/evidence/store.js and fail).\n" +
      "From the repo root run:\n" +
      "  npm install\n" +
      "  npx playwright install chromium\n" +
      "  npm run demo\n",
  );
}

const child = spawn(process.execPath, args, { stdio: "inherit", cwd: root });
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
