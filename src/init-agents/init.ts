import { mkdirSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { agentDir, type AgentLoop } from "./loops.js";
import { mergePlaywrightTestMcp } from "./mcp.js";
import { AGENT_SPECS, renderAgentFile } from "./templates.js";

export interface InitAgentsOptions {
  cwd: string;
  loop: AgentLoop;
  url?: string;
}

export interface InitAgentsResult {
  directory: string;
  files: string[];
  tests: string[];
  configPath: string;
  mcpPath: string;
}

function listPlaywrightTests(cwd: string): string[] {
  const hits: string[] = [];
  const skip = new Set(["node_modules", "dist", "coverage", ".git", "reports", "evidence"]);

  const walk = (dir: string, depth: number): void => {
    if (depth > 6) {
      return;
    }
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (skip.has(name) || name.startsWith(".")) {
        continue;
      }
      const full = join(dir, name);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(full, depth + 1);
      } else if (/\.(spec|test)\.(ts|js|tsx|jsx|mjs|cjs)$/.test(name)) {
        hits.push(relative(cwd, full));
      }
    }
  };

  walk(cwd, 0);
  return hits.sort();
}

function writeConfig(cwd: string, url: string | undefined, tests: string[]): string {
  const path = join(cwd, "aup.config.yaml");
  if (existsSync(path)) {
    return path;
  }
  const target = url ?? "https://example.com";
  const testNote =
    tests.length > 0
      ? tests
          .slice(0, 12)
          .map((file) => `#   - ${file}`)
          .join("\n")
      : "#   (none found — agents will ask which spec to use)";
  const body = `# AUP — journeys are your existing Playwright tests, not a second map.
target:
  url: ${target}

# Tests discovered at init (informational):
${testNote}
`;
  writeFileSync(path, body);
  return path;
}

export function initAgents(options: InitAgentsOptions): InitAgentsResult {
  const { dir, extension } = agentDir(options.loop, options.cwd);
  mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  for (const spec of AGENT_SPECS) {
    const file = join(dir, `${spec.slug}${extension}`);
    writeFileSync(file, renderAgentFile(spec, options.loop));
    files.push(relative(options.cwd, file));
  }
  const tests = listPlaywrightTests(options.cwd);
  const configPath = relative(options.cwd, writeConfig(options.cwd, options.url, tests));
  const mcpPath = mergePlaywrightTestMcp(options.loop, options.cwd);
  return { directory: relative(options.cwd, dir), files, tests, configPath, mcpPath };
}
