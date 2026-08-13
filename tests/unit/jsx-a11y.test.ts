import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildModelPacket } from "../../src/ai/packet.js";
import { findingsFromJsxA11y } from "../../src/personas/static-jsx-a11y.js";
import type { ExplorationContext } from "../../src/personas/types.js";
import { collectJsxA11yHits } from "../../src/skills/jsx-a11y-collect.js";
import { parseEslintJsxA11y, projectHasJsxA11y, type JsxA11yHit } from "../../src/skills/jsx-a11y.js";
import { jsxA11yLenses, translateJsxA11y } from "../../src/voice/jsx-a11y-stories.js";

function hit(ruleId: string, extra?: Partial<JsxA11yHit>): JsxA11yHit {
  return {
    ruleId,
    pluginRule: `jsx-a11y/${ruleId}`,
    message: `${ruleId} failed`,
    file: "src/Pay.tsx",
    line: 12,
    column: 4,
    severity: 2,
    ...extra,
  };
}

function ctx(hits: JsxA11yHit[]): ExplorationContext {
  return {
    jsxA11y: hits,
    journey: { id: "checkout", name: "Checkout", steps: [] },
    step: { id: "land", name: "Land", kind: "explore", scan: true },
  } as unknown as ExplorationContext;
}

describe("jsx-a11y static analysis", () => {
  it("parses only jsx-a11y messages from ESLint JSON", () => {
    const hits = parseEslintJsxA11y(
      [
        {
          filePath: "/app/src/Pay.tsx",
          messages: [
            { ruleId: "jsx-a11y/alt-text", message: "img missing alt", line: 8, column: 2, severity: 2 },
            { ruleId: "no-unused-vars", message: "unused", line: 1, column: 1, severity: 1 },
            { ruleId: "jsx-a11y/no-autofocus", message: "no autofocus", line: 20, column: 1, severity: 1 },
          ],
        },
      ],
      "/app",
    );
    expect(hits).toEqual([
      expect.objectContaining({ ruleId: "alt-text", file: "src/Pay.tsx", line: 8 }),
      expect.objectContaining({ ruleId: "no-autofocus", file: "src/Pay.tsx", line: 20, severity: 1 }),
    ]);
  });

  it("detects the plugin from package.json and skips collect when it is absent", () => {
    expect(
      projectHasJsxA11y("/app", () =>
        JSON.stringify({ devDependencies: { "eslint-plugin-jsx-a11y": "^6.10.0" } }),
      ),
    ).toBe(true);
    const cwd = mkdtempSync(join(tmpdir(), "aup-jsx-"));
    mkdirSync(cwd, { recursive: true });
    writeFileSync(join(cwd, "package.json"), JSON.stringify({ name: "shop" }));
    const result = collectJsxA11yHits(cwd);
    expect(result.hits).toEqual([]);
    expect(result.skippedReason).toMatch(/not installed/);
  });

  it("routes hits to John, Deep, and Sapna from their own lens", () => {
    expect(jsxA11yLenses("click-events-have-key-events")).toEqual(["john"]);
    expect(jsxA11yLenses("alt-text")).toEqual(["deep"]);
    expect(jsxA11yLenses("no-autofocus")).toEqual(["john", "sapna"]);
    expect(translateJsxA11y("john", hit("alt-text"))).toBeNull();
    expect(translateJsxA11y("deep", hit("alt-text"))?.livedMoment).toMatch(/Deep/);

    const hits = [
      hit("click-events-have-key-events"),
      hit("alt-text"),
      hit("no-autofocus"),
      hit("no-distracting-elements"),
    ];
    const john = findingsFromJsxA11y(ctx(hits), "john");
    const deep = findingsFromJsxA11y(ctx(hits), "deep");
    const sapna = findingsFromJsxA11y(ctx(hits), "sapna");
    expect(john.map((finding) => finding.tags)).toEqual(
      expect.arrayContaining([expect.arrayContaining(["jsx-a11y", "click-events-have-key-events"])]),
    );
    expect(deep.some((finding) => finding.tags.includes("alt-text"))).toBe(true);
    expect(sapna.some((finding) => finding.tags.includes("no-autofocus"))).toBe(true);
    expect(john.every((finding) => finding.evidence.jsxA11y?.ruleId.startsWith("jsx-a11y/"))).toBe(true);
  });

  it("puts jsx-a11y proof in the packet without the lint message dump", () => {
    const findings = findingsFromJsxA11y(ctx([hit("alt-text")]), "deep");
    const packet = buildModelPacket(
      {
        targetUrl: "https://shop.example.com",
        findings,
        summary: {
          findingCount: 1,
          clusterCount: 0,
          bySeverity: { critical: 0, high: 0, medium: 1, low: 0 },
          byAgent: { asha: 0, john: 0, deep: 1, sapna: 0 },
          journeysWithActionableEvidence: 1,
          journeyCount: 1,
          keyboardBlocked: false,
        },
        journeys: [{ journeyId: "checkout", completed: true, blockedAt: null, notes: [] }],
      },
      1800,
    );
    expect(packet.moments[0]?.proof).toBe("jsx-a11y:alt-text");
    expect(JSON.stringify(packet)).not.toContain("img missing alt");
    expect(packet.instruction).toContain("eslint JSON");
  });
});
