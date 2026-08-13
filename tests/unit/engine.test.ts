import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRunConfig } from "../../src/config/load.js";
import { ConfigError } from "../../src/errors.js";
import { clusterFindings, collapseRepeatedFindings, dedupeFindings } from "../../src/findings/engine.js";
import { createFinding } from "../../src/personas/types.js";
import { FindingSchema } from "../../src/schema/finding.js";
import { axeImpactToSeverity, maxSeverity, meetsFailOn } from "../../src/util/severity.js";
import { stableId } from "../../src/util/ids.js";
import { renderMarkdownReport } from "../../src/report/write.js";
import { REPORT_SCHEMA_VERSION } from "../../src/schema/versions.js";
import type { Report } from "../../src/schema/report.js";

describe("stableId", () => {
  it("is deterministic and case-insensitive", () => {
    expect(stableId("John", " Checkout ")).toBe(stableId("john", "checkout"));
    expect(stableId("a")).not.toBe(stableId("b"));
  });
});

describe("severity", () => {
  it("maps axe impact and fail-on thresholds", () => {
    expect(axeImpactToSeverity("serious")).toBe("high");
    expect(maxSeverity(["low", "critical", "medium"])).toBe("critical");
    expect(meetsFailOn("high", "high")).toBe(true);
    expect(meetsFailOn("medium", "high")).toBe(false);
  });
});

describe("finding engine", () => {
  it("deduplicates identical ids and clusters related observations", () => {
    const john = createFinding({
      agent: "john",
      journey: "checkout",
      step: "dialog",
      category: "keyboard",
      severity: "high",
      confidence: "high",
      finding: "Keyboard focus remains on the underlying page after a dialog opens.",
      livedMoment: "A dialog opened. John was still typing on the page underneath.",
      habit: "Opening a layer is a scene change. Take the user’s focus with you.",
      impact: "Users interact behind the modal.",
      recommendation: "Move focus into the dialog.",
      evidence: { target: ".modal", wcag: ["2.4.3"], notes: [] },
    });
    const deep = createFinding({
      agent: "deep",
      journey: "checkout",
      step: "dialog",
      category: "screen-reader",
      severity: "high",
      confidence: "high",
      finding: "The open dialog is not named in the accessibility tree.",
      livedMoment: "Deep entered a room with no sign on the door.",
      habit: "Every overlay is a scene. Title the scene.",
      impact: "Unlabeled overlay.",
      recommendation: "Name the dialog.",
      evidence: { target: ".modal", wcag: ["4.1.2"], notes: [] },
    });
    const asha = createFinding({
      agent: "asha",
      journey: "checkout",
      step: "dialog",
      category: "automated",
      severity: "high",
      confidence: "high",
      finding: "A button never says what it does",
      livedMoment: "Deep hears only “button”.",
      habit: "If you ship a control, read it out loud.",
      impact: "axe violation",
      recommendation: "Name the button",
      evidence: {
        target: ".icon-close",
        axe: {
          ruleId: "button-name",
          impact: "critical",
          help: "Buttons must have discernible text",
          tags: ["wcag2a"],
          nodes: [],
        },
        wcag: ["wcag2a"],
        notes: [],
      },
    });

    expect(FindingSchema.parse(john).id).toHaveLength(16);
    const duped = dedupeFindings([john, john, deep, asha]);
    expect(duped).toHaveLength(3);
    const clusters = clusterFindings(duped);
    expect(clusters.length).toBeGreaterThanOrEqual(2);
    expect(clusters.some((cluster) => cluster.agents.includes("asha"))).toBe(true);

    const repeated = collapseRepeatedFindings([
      john,
      { ...john, id: "other", step: "landing" },
    ]);
    expect(repeated).toHaveLength(1);
    expect(repeated[0]?.tags).toContain("also:landing");
  });
});

describe("loadRunConfig", () => {
  it("loads yaml and applies CLI overrides", () => {
    const dir = mkdtempSync(join(tmpdir(), "aup-"));
    const path = join(dir, "aup.config.yaml");
    writeFileSync(
      path,
      `
target:
  url: http://127.0.0.1:4173
agents: [asha]
failOn: medium
`,
    );
    const config = loadRunConfig({
      configPath: path,
      url: "http://example.com/",
      agents: "john,deep",
      failOn: "critical",
    });
    expect(config.target.url).toBe("http://example.com/");
    expect(config.agents).toEqual(["john", "deep"]);
    expect(config.failOn).toBe("critical");
  });

  it("rejects missing target URL", () => {
    const dir = mkdtempSync(join(tmpdir(), "aup-"));
    const path = join(dir, "aup.config.yaml");
    writeFileSync(path, "agents: [asha]\n");
    expect(() => loadRunConfig({ configPath: path })).toThrow(ConfigError);
  });
});

describe("markdown report", () => {
  it("links every finding to a journey step and evidence", () => {
    const finding = createFinding({
      agent: "sapna",
      journey: "checkout",
      step: "form",
      category: "cognitive",
      severity: "medium",
      confidence: "medium",
      finding: "Multiple visually similar primary actions.",
      livedMoment: "Sapna saw Save, Apply, and Continue with equal weight.",
      habit: "If everything is a primary button, nothing is.",
      impact: "Decision effort.",
      recommendation: "One primary CTA.",
      evidence: { snapshotPath: "evidence/run/form/sapna.json", wcag: [], notes: ["Save", "Apply", "Continue"] },
    });
    const report: Report = {
      schemaVersion: REPORT_SCHEMA_VERSION,
      generatedAt: "2026-08-13T00:00:00.000Z",
      runId: "test-run",
      targetUrl: "http://127.0.0.1:4173",
      agents: ["sapna"],
      summary: {
        findingCount: 1,
        clusterCount: 1,
        bySeverity: { critical: 0, high: 0, medium: 1, low: 0 },
        byAgent: { sapna: 1, john: 0, deep: 0, asha: 0 },
        journeysWithActionableEvidence: 1,
        journeyCount: 1,
        keyboardBlocked: false,
      },
      journeys: [{ journeyId: "checkout", completed: true, blockedAt: null, notes: [] }],
      findings: [finding],
      clusters: clusterFindings([finding]),
      evidenceRoot: "evidence/test-run",
    };
    const markdown = renderMarkdownReport(report);
    expect(markdown).toContain("during **form**");
    expect(markdown).toContain("evidence/run/form/sapna.json");
    expect(markdown).toContain("Sapna");
    expect(markdown).toContain("What to remember the next time you write UI");
    expect(markdown).toContain("Sapna saw Save, Apply, and Continue");
    expect(markdown).not.toMatch(/button-name:/);
  });
});
