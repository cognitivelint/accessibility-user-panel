#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRunConfig } from "./config/load.js";
import { ConfigError } from "./errors.js";
import { createLogger } from "./logging.js";
import { renderCliBriefing } from "./report/write.js";
import { runAccessibilityPanel } from "./runner/run.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, "../package.json"), "utf8")) as { version: string };

interface RunOpts {
  url?: string;
  config?: string;
  agents?: string;
  headed?: boolean;
  failOn?: string;
  reportsDir?: string;
  evidenceDir?: string;
  logLevel?: string;
}

function addRunOptions(command: Command): Command {
  return command
    .option("-u, --url <url>", "Target application URL")
    .option("-c, --config <path>", "Path to aup.config.yaml|json")
    .option("-a, --agents <list>", "Comma-separated agents: john,deep,sapna,asha")
    .option("--headed", "Run with a visible browser", false)
    .option("--fail-on <severity>", "Exit 1 when a finding meets this severity (critical|high|medium|low)")
    .option("--reports-dir <dir>", "Report output directory")
    .option("--evidence-dir <dir>", "Evidence artifact directory")
    .option("--log-level <level>", "debug|info|warn|error", "info");
}

async function executeRun(opts: RunOpts): Promise<void> {
  const log = createLogger((opts.logLevel as "info") ?? "info", { app: "aup" });
  try {
    const config = loadRunConfig({
      url: opts.url,
      configPath: opts.config,
      agents: opts.agents,
      headed: opts.headed,
      failOn: opts.failOn,
      reportsDir: opts.reportsDir,
      evidenceDir: opts.evidenceDir,
    });
    const result = await runAccessibilityPanel(config, log);
    process.stdout.write(`\n${renderCliBriefing(result.report)}\n\nBriefing: ${result.markdownPath}\n`);
    process.exitCode = result.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(message);
    process.exitCode = error instanceof ConfigError ? 2 : 2;
  }
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("aup")
    .description("Accessibility User Panel — persona-based Playwright + axe-core exploration")
    .version(pkg.version);

  addRunOptions(program).action(async (opts: RunOpts) => {
    await executeRun(opts);
  });

  addRunOptions(
    program.command("run", { isDefault: true }).description("Execute persona agents against a web application journey"),
  ).action(async (opts: RunOpts) => {
    await executeRun(opts);
  });

  program
    .command("agents")
    .description("List persona agent contracts")
    .action(() => {
      process.stdout.write(
        ["john    Keyboard-only user", "deep    Screen-reader semantics user", "sapna   Cognitive and sensory perspective", "asha    Deterministic axe-core auditor", ""].join("\n"),
      );
    });

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(2);
});
