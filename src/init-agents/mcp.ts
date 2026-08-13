import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { AgentLoop } from "./loops.js";

const PLAYWRIGHT_TEST_SERVER = {
  type: "stdio",
  command: "npx",
  args: ["playwright", "run-test-mcp-server"],
} as const;

export function mcpConfigPath(loop: AgentLoop, cwd: string): string {
  switch (loop) {
    case "vscode":
      return join(cwd, ".vscode", "mcp.json");
    case "claude":
      return join(cwd, ".mcp.json");
    case "cursor":
      return join(cwd, ".cursor", "mcp.json");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function mergePlaywrightTestMcp(loop: AgentLoop, cwd: string): string {
  const path = mcpConfigPath(loop, cwd);
  mkdirSync(dirname(path), { recursive: true });

  let existing: Record<string, unknown> = {};
  if (existsSync(path)) {
    try {
      existing = asRecord(JSON.parse(readFileSync(path, "utf8")));
    } catch {
      existing = {};
    }
  }

  if (loop === "vscode") {
    const servers = asRecord(existing.servers);
    servers["playwright-test"] = { ...PLAYWRIGHT_TEST_SERVER };
    const next = {
      ...existing,
      servers,
      inputs: Array.isArray(existing.inputs) ? existing.inputs : [],
    };
    writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
    return relative(cwd, path);
  }

  const mcpServers = asRecord(existing.mcpServers);
  mcpServers["playwright-test"] = {
    command: PLAYWRIGHT_TEST_SERVER.command,
    args: [...PLAYWRIGHT_TEST_SERVER.args],
  };
  const next = { ...existing, mcpServers };
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
  return relative(cwd, path);
}
