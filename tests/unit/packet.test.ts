import { describe, expect, it } from "vitest";
import { buildModelPacket } from "../../src/ai/packet.js";
import { estimateTokens } from "../../src/ai/tokens.js";
import { createFinding } from "../../src/personas/types.js";

function finding(index: number, severity: "critical" | "high" | "medium" | "low" = "low") {
  return createFinding({
    agent: "asha",
    journey: "checkout",
    step: `step-${index}`,
    category: "automated",
    severity,
    confidence: "high",
    finding: `Issue ${index} with a fairly long title about a control that never introduces itself properly`,
    livedMoment: "Deep hears only button. ".repeat(20),
    habit: "Read every control out loud before you ship it to production this week.",
    impact: "Guessing.",
    recommendation: "Name it.",
    evidence: {
      axe: { ruleId: "button-name", impact: "serious", help: "Buttons must have discernible text", tags: [], nodes: [] },
      wcag: [],
      notes: [],
      domContext: "<div>".repeat(500),
    },
  });
}

describe("model packet", () => {
  it("stays under the token budget and never includes DOM or full axe nodes", () => {
    const findings = [
      finding(0, "critical"),
      finding(1, "high"),
      ...Array.from({ length: 40 }, (_, index) => finding(index + 2, "low")),
    ];
    const packet = buildModelPacket(
      {
        targetUrl: "http://127.0.0.1:4173/checkout?verbose=true",
        findings,
        summary: {
          findingCount: findings.length,
          clusterCount: 1,
          bySeverity: { critical: 1, high: 1, medium: 0, low: 40 },
          byAgent: { asha: findings.length, john: 0, deep: 0, sapna: 0 },
          journeysWithActionableEvidence: 1,
          journeyCount: 1,
          keyboardBlocked: true,
        },
        journeys: [{ journeyId: "checkout", completed: false, blockedAt: "landing", notes: [] }],
      },
      800,
    );

    expect(packet.budget.usedTokens).toBeLessThanOrEqual(800);
    expect(packet.budget.droppedMoments).toBeGreaterThan(0);
    expect(packet.moments.length).toBeGreaterThan(0);
    expect(packet.moments.length).toBeLessThanOrEqual(10);
    expect(JSON.stringify(packet)).not.toContain("<div>");
    expect(JSON.stringify(packet)).not.toContain("Buttons must have discernible text");
    expect(packet.moments[0]?.proof).toBe("axe:button-name");
    expect(packet.moments[0]?.severity).toBe("critical");
    expect(estimateTokens(JSON.stringify(packet))).toBe(packet.budget.usedTokens);
    expect(packet.instruction).toContain("Do not re-run axe");
  });
});
