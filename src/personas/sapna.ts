import { collectCognitiveSignals } from "../skills/cognitive.js";
import { createFinding, type ExplorationContext, type PersonaAgent } from "./types.js";
import type { Finding } from "../schema/finding.js";

export class SapnaCognitiveAgent implements PersonaAgent {
  readonly id = "sapna" as const;

  async evaluate(ctx: ExplorationContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const signals = await collectCognitiveSignals(ctx.page);
    const evidencePath = ctx.evidence.json(
      `${ctx.journey.id}/${ctx.step.id}/sapna-cognitive-signals.json`,
      signals,
    );

    const uniquePrimary = [...new Set(signals.competingPrimaryActions.map((label) => label.toLowerCase()))];
    if (uniquePrimary.length >= 3) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "cognitive",
          severity: "medium",
          confidence: "medium",
          finding: `This state presents multiple visually similar primary actions (${uniquePrimary.join(", ")}).`,
          impact: "Increased decision effort and uncertainty about which action advances the journey.",
          recommendation: "Keep one primary call to action per view; demote secondary actions visually and in copy.",
          evidence: {
            snapshotPath: evidencePath,
            notes: signals.competingPrimaryActions,
          },
          tags: ["cta", "decision-effort"],
        }),
      );
    }

    if (signals.vagueButtons.length > 0) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "cognitive",
          severity: "low",
          confidence: "medium",
          finding: `Calls to action use vague labels: ${[...new Set(signals.vagueButtons)].join(", ")}.`,
          impact: "The next step is ambiguous without extra reading or trial and error.",
          recommendation: "Use verbs that name the outcome, such as 'Pay now' or 'Save draft'.",
          evidence: { snapshotPath: evidencePath, notes: signals.vagueButtons },
          tags: ["cta"],
        }),
      );
    }

    if (signals.placeholderOnlyFields > 0) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "cognitive",
          severity: "medium",
          confidence: "high",
          finding: `${signals.placeholderOnlyFields} field(s) use placeholder text as the only instruction.`,
          impact: "Instructions disappear while typing, increasing memory burden.",
          recommendation: "Keep a persistent visible label; use placeholder only for an example value.",
          evidence: { snapshotPath: evidencePath, wcag: ["3.3.2"] },
          tags: ["memory-burden"],
        }),
      );
    }

    if (signals.autoUpdatingRegions > 0 || signals.animatedElements > 8) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "cognitive",
          severity: "medium",
          confidence: "medium",
          finding: "The view contains auto-updating or persistently animated content while a task is in progress.",
          impact: "Motion and competing updates increase sensory load and pull attention from the task.",
          recommendation: "Pause auto-rotation by default, honor prefers-reduced-motion, and avoid decorative animation during forms.",
          evidence: {
            snapshotPath: evidencePath,
            notes: [`animated=${signals.animatedElements}`, `auto=${signals.autoUpdatingRegions}`],
          },
          tags: ["motion", "sensory"],
        }),
      );
    }

    if (signals.errorMessages.length > 0 && !signals.errorsAssociated) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "cognitive",
          severity: "high",
          confidence: "high",
          finding: "Validation errors are shown but not programmatically associated with the fields they describe.",
          impact: "Recovery requires searching the page for what went wrong and which field to fix.",
          recommendation: "Place error text next to the field, reference it with aria-describedby, and move focus to the first error.",
          evidence: {
            snapshotPath: evidencePath,
            notes: signals.errorMessages,
            wcag: ["3.3.1", "3.3.3"],
          },
          tags: ["error-recovery"],
        }),
      );
    }

    return findings;
  }
}
