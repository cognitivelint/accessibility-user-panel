import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLogger } from "../../src/logging.js";
import { loadRunConfig } from "../../src/config/load.js";
import { runAccessibilityPanel } from "../../src/runner/run.js";

const fixture = fileURLToPath(new URL("../../fixtures/demo-app/index.html", import.meta.url));

describe("demo checkout panel", () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    const html = await readFile(fixture);
    server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind demo server");
    }
    url = `http://127.0.0.1:${address.port}/`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("produces persona evidence across the checkout journey", async () => {
    const config = loadRunConfig({
      url,
      configPath: fileURLToPath(new URL("../../aup.config.yaml", import.meta.url)),
      reportsDir: "reports",
      evidenceDir: "evidence",
    });
    config.target.url = url;
    const result = await runAccessibilityPanel(config, createLogger("error", { test: "e2e" }));

    expect(result.report.findings.length).toBeGreaterThan(3);
    expect(result.report.findings.every((finding) => finding.journey && finding.step && finding.evidence)).toBe(true);

    const agents = new Set(result.report.findings.map((finding) => finding.agent));
    expect(agents.has("john")).toBe(true);
    expect(agents.has("deep")).toBe(true);
    expect(agents.has("sapna")).toBe(true);
    expect(agents.has("asha")).toBe(true);

    expect(
      result.report.findings.some(
        (finding) => finding.agent === "john" && finding.tags.includes("keyboard-operable"),
      ),
    ).toBe(true);
    expect(
      result.report.findings.some((finding) => finding.agent === "deep" && finding.tags.includes("forms")),
    ).toBe(true);
    expect(
      result.report.findings.some((finding) => finding.agent === "sapna" && finding.category === "cognitive"),
    ).toBe(true);
    expect(
      result.report.findings.some((finding) => finding.agent === "asha" && finding.evidence.axe),
    ).toBe(true);
    expect(result.report.clusters.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(1);

    expect(
      result.report.findings.every((finding) => finding.livedMoment.length > 0 && finding.habit.length > 0),
    ).toBe(true);
    expect(result.report.findings.some((finding) => finding.finding.toLowerCase().includes("aria-label"))).toBe(false);
    expect(result.report.findings.some((finding) => /^[a-z0-9-]+?:/.test(finding.finding))).toBe(false);

    const { readFileSync } = await import("node:fs");
    const briefing = readFileSync(result.markdownPath, "utf8");
    expect(briefing).toContain("How this page felt");
    expect(briefing).toContain("What to remember the next time you write UI");
    expect(briefing).toContain("John");
    expect(briefing).toContain("Deep");
    expect(briefing).toContain("Sapna");
  });
});
