import { mkdirSync, writeFileSync, readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { initAgents } from "../../src/init-agents/init.js";
import { normalizeLoop } from "../../src/init-agents/loops.js";

describe("init-agents", () => {
  it("rejects unknown loops", () => {
    expect(() => normalizeLoop("emacs")).toThrow(/Unknown loop/);
  });

  it("writes VS Code agent files under .github/agents and finds existing tests", () => {
    const cwd = mkdtempSync(join(tmpdir(), "aup-init-"));
    mkdirSync(join(cwd, "tests"), { recursive: true });
    writeFileSync(join(cwd, "tests", "checkout.spec.ts"), "test('pay', async ({ page }) => {});");

    const result = initAgents({ cwd, loop: "vscode", url: "https://shop.example.com" });

    expect(result.directory).toBe(".github/agents");
    expect(result.files).toEqual(
      expect.arrayContaining([
        ".github/agents/aup-panel.agent.md",
        ".github/agents/aup-john.agent.md",
        ".github/agents/aup-deep.agent.md",
        ".github/agents/aup-sapna.agent.md",
        ".github/agents/aup-asha.agent.md",
      ]),
    );
    expect(result.tests).toContain("tests/checkout.spec.ts");
    expect(result.mcpPath).toBe(".vscode/mcp.json");
    const panel = readFileSync(join(cwd, ".github/agents/aup-panel.agent.md"), "utf8");
    expect(panel).toContain("name: aup-panel");
    expect(panel).toContain("playwright-test/browser_navigate");
    expect(panel).toContain("eslint-plugin-jsx-a11y");
    expect(panel).toContain("Existing Playwright tests");
    expect(panel).toContain("handoffs:");
    expect(panel).toContain("agent: aup-john");
    const config = readFileSync(join(cwd, "aup.config.yaml"), "utf8");
    expect(config).toContain("https://shop.example.com");
    expect(config).toContain("tests/checkout.spec.ts");
    const mcp = JSON.parse(readFileSync(join(cwd, ".vscode/mcp.json"), "utf8")) as {
      servers: { "playwright-test": { args: string[] } };
    };
    expect(mcp.servers["playwright-test"].args).toEqual(["playwright", "run-test-mcp-server"]);
  });

  it("treats copilot as vscode and does not clobber existing config or other MCP servers", () => {
    const cwd = mkdtempSync(join(tmpdir(), "aup-init-"));
    writeFileSync(join(cwd, "aup.config.yaml"), "target:\n  url: https://keep.example.com\n");
    mkdirSync(join(cwd, ".vscode"), { recursive: true });
    writeFileSync(
      join(cwd, ".vscode", "mcp.json"),
      JSON.stringify({ servers: { github: { type: "http", url: "https://api.githubcopilot.com/mcp" } } }),
    );

    const result = initAgents({ cwd, loop: normalizeLoop("copilot"), url: "https://ignored.example.com" });
    expect(result.directory).toBe(".github/agents");
    expect(readFileSync(join(cwd, "aup.config.yaml"), "utf8")).toContain("https://keep.example.com");
    const mcp = JSON.parse(readFileSync(join(cwd, ".vscode/mcp.json"), "utf8")) as {
      servers: Record<string, unknown>;
    };
    expect(mcp.servers.github).toEqual({ type: "http", url: "https://api.githubcopilot.com/mcp" });
    expect(mcp.servers["playwright-test"]).toBeDefined();
  });

  it("writes Claude agents under .claude/agents", () => {
    const cwd = mkdtempSync(join(tmpdir(), "aup-init-"));
    const result = initAgents({ cwd, loop: "claude" });
    expect(result.files).toContain(".claude/agents/aup-panel.md");
    expect(result.mcpPath).toBe(".mcp.json");
    const body = readFileSync(join(cwd, ".claude/agents/aup-john.md"), "utf8");
    expect(body).toContain("model: inherit");
    expect(body).toContain("eslint-plugin-jsx-a11y");
  });
});
