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

let args;
if (existsSync(compiled)) {
  args = [compiled, ...extra];
} else if (existsSync(tsx) && existsSync(source)) {
  args = [tsx, source, ...extra];
} else {
  process.stderr.write(
    "Run npm install in accessibility-user-panel, then: npx aup init-agents --loop=vscode\n",
  );
  process.exit(2);
}

const child = spawn(process.execPath, args, { stdio: "inherit", cwd: process.cwd() });
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
