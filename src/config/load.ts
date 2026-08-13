import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { ConfigError } from "../errors.js";
import { RunConfigSchema, type RunConfig } from "../schema/report.js";
import type { AgentId } from "../schema/finding.js";

export interface CliOverrides {
  url?: string;
  configPath?: string;
  agents?: string;
  headed?: boolean;
  failOn?: string;
  reportsDir?: string;
  evidenceDir?: string;
}

const DEFAULT_CONFIG_FILES = ["aup.config.yaml", "aup.config.yml", "aup.config.json"];

function readConfigFile(path: string): unknown {
  if (!existsSync(path)) {
    throw new ConfigError(`Config file not found: ${path}`);
  }
  const raw = readFileSync(path, "utf8");
  if (path.endsWith(".json")) {
    return JSON.parse(raw) as unknown;
  }
  return parseYaml(raw);
}

function discoverConfigPath(explicit?: string): string | undefined {
  if (explicit) {
    return resolve(explicit);
  }
  return DEFAULT_CONFIG_FILES.map((name) => resolve(name)).find((path) => existsSync(path));
}

export function loadRunConfig(overrides: CliOverrides): RunConfig {
  const path = discoverConfigPath(overrides.configPath);
  const fileConfig = path ? readConfigFile(path) : {};
  const envUrl = process.env.AUP_URL;
  const envHeadless = process.env.AUP_HEADLESS;
  const envFailOn = process.env.AUP_FAIL_ON;

  const merged = {
    ...(typeof fileConfig === "object" && fileConfig ? fileConfig : {}),
    target: {
      ...((fileConfig as { target?: object })?.target ?? {}),
      url: overrides.url ?? envUrl ?? (fileConfig as { target?: { url?: string } })?.target?.url,
    },
  };

  if (overrides.reportsDir || overrides.evidenceDir) {
    (merged as { output?: object }).output = {
      ...((fileConfig as { output?: object })?.output ?? {}),
      ...(overrides.reportsDir ? { reportsDir: overrides.reportsDir } : {}),
      ...(overrides.evidenceDir ? { evidenceDir: overrides.evidenceDir } : {}),
    };
  }

  if (overrides.agents) {
    (merged as { agents?: AgentId[] }).agents = overrides.agents
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean) as AgentId[];
  }

  if (overrides.headed) {
    (merged as { headless?: boolean }).headless = false;
  } else if (envHeadless === "false") {
    (merged as { headless?: boolean }).headless = false;
  }

  if (overrides.failOn ?? envFailOn) {
    (merged as { failOn?: string }).failOn = overrides.failOn ?? envFailOn;
  }

  const parsed = RunConfigSchema.safeParse(merged);
  if (!parsed.success) {
    throw new ConfigError(`Invalid configuration: ${parsed.error.message}`, parsed.error);
  }
  return parsed.data;
}
