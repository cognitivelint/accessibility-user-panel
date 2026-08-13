import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  parseEslintJsxA11y,
  projectHasJsxA11y,
  type EslintJsonFile,
  type JsxA11yHit,
} from "./jsx-a11y.js";

const MAX_HITS = 24;
const ESLINT_TIMEOUT_MS = 45_000;

export interface CollectJsxA11yResult {
  hits: JsxA11yHit[];
  skippedReason?: string;
}

function eslintBin(cwd: string): string | undefined {
  const unix = join(cwd, "node_modules", ".bin", "eslint");
  const win = join(cwd, "node_modules", ".bin", "eslint.cmd");
  if (existsSync(unix)) {
    return unix;
  }
  if (existsSync(win)) {
    return win;
  }
  return undefined;
}

export function collectJsxA11yHits(cwd: string, maxHits: number = MAX_HITS): CollectJsxA11yResult {
  const hasPlugin = projectHasJsxA11y(cwd, (path) => readFileSync(path, "utf8"));
  if (!hasPlugin && !existsSync(join(cwd, "node_modules", "eslint-plugin-jsx-a11y"))) {
    return { hits: [], skippedReason: "eslint-plugin-jsx-a11y is not installed" };
  }
  const bin = eslintBin(cwd);
  if (!bin) {
    return { hits: [], skippedReason: "eslint is not installed in this project" };
  }

  const result = spawnSync(bin, [".", "-f", "json", "--no-error-on-unmatched-pattern"], {
    cwd,
    encoding: "utf8",
    timeout: ESLINT_TIMEOUT_MS,
    maxBuffer: 8 * 1024 * 1024,
  });

  const stdout = result.stdout?.trim() ?? "";
  if (!stdout.startsWith("[")) {
    return { hits: [], skippedReason: "eslint did not return JSON" };
  }

  let report: EslintJsonFile[];
  try {
    report = JSON.parse(stdout) as EslintJsonFile[];
  } catch {
    return { hits: [], skippedReason: "eslint JSON could not be parsed" };
  }

  return { hits: parseEslintJsxA11y(report, cwd).slice(0, maxHits) };
}
