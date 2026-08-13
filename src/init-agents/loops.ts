export const LOOPS = ["vscode", "cursor", "claude"] as const;
export type AgentLoop = (typeof LOOPS)[number];

export function normalizeLoop(value: string): AgentLoop {
  const loop = value.toLowerCase();
  if (loop === "copilot") {
    return "vscode";
  }
  if ((LOOPS as readonly string[]).includes(loop)) {
    return loop as AgentLoop;
  }
  throw new Error(`Unknown loop "${value}". Use: vscode, cursor, claude (copilot is an alias of vscode).`);
}

export function agentDir(loop: AgentLoop, cwd: string): { dir: string; extension: string } {
  switch (loop) {
    case "vscode":
      return { dir: `${cwd}/.github/agents`, extension: ".agent.md" };
    case "cursor":
      return { dir: `${cwd}/.cursor/agents`, extension: ".md" };
    case "claude":
      return { dir: `${cwd}/.claude/agents`, extension: ".md" };
  }
}

export const PLAYWRIGHT_BROWSER_TOOLS = [
  "playwright-test/browser_click",
  "playwright-test/browser_close",
  "playwright-test/browser_console_messages",
  "playwright-test/browser_evaluate",
  "playwright-test/browser_handle_dialog",
  "playwright-test/browser_hover",
  "playwright-test/browser_navigate",
  "playwright-test/browser_navigate_back",
  "playwright-test/browser_press_key",
  "playwright-test/browser_select_option",
  "playwright-test/browser_snapshot",
  "playwright-test/browser_type",
  "playwright-test/browser_wait_for",
] as const;

export const VSCODE_SEARCH_TOOLS = [
  "search/fileSearch",
  "search/textSearch",
  "search/listDirectory",
  "search/readFile",
] as const;
