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
          finding: "Too many ‘important’ buttons ask for a decision at once",
          livedMoment: `Sapna sees ${uniquePrimary.join(", ")} sitting side by side, same weight, same urgency. She is not sure which one actually finishes the task, and choosing wrong feels expensive.`,
          impact: "Decision effort goes up. People freeze, click the wrong action, or abandon the step.",
          recommendation: "One primary action per view. Demote Save/Apply/secondary paths visually and in copy.",
          habit: "If everything is a primary button, nothing is. Pick the one thing this screen is for.",
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
          finding: "The buttons do not say what will happen",
          livedMoment: `Labels like ${[...new Set(signals.vagueButtons)].join(", ")} ask Sapna to already know the outcome. ‘Continue’ toward what? ‘Save’ what, and where?`,
          impact: "The next step is a riddle. People hesitate or learn by making mistakes.",
          recommendation: "Name the outcome: ‘Pay $42’, ‘Save draft’, ‘Apply discount’. Verbs with objects.",
          habit: "Button copy is a contract. Write the ending of the sentence, not a shrug.",
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
          finding: "The instructions vanish as soon as Sapna starts typing",
          livedMoment: `${signals.placeholderOnlyFields} field(s) use ghost text as the only hint. The moment she types, the hint is gone. She has to remember what the box wanted, or delete her work to peek again.`,
          impact: "Memory load goes up in the middle of a task, especially on payment and identity fields.",
          recommendation: "Keep a label outside the field. Placeholders can show an example, not the only instruction.",
          habit: "Placeholders are guests. Labels live here.",
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
          finding: "The page keeps moving while she is trying to think",
          livedMoment:
            "A ticker, a carousel, or persistent animation runs beside the form. Sapna’s attention is pulled off the task she came to finish. The screen will not sit still.",
          impact: "Motion raises sensory load and makes errors more likely on forms and payments.",
          recommendation: "Pause auto-rotation by default. Honour prefers-reduced-motion. Do not decorate a form with looping animation.",
          habit: "If someone is filling a form, the rest of the page should be quiet.",
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
          finding: "The page says something is wrong, but not how to make it right",
          livedMoment: `Sapna submitted and the form pushed back (“${signals.errorMessages[0] ?? "error"}”). The message is somewhere on the screen, not tied to the field, and focus did not move to help her. Recovery is a scavenger hunt.`,
          impact: "People who already felt unsure now have to search for the mistake and the fix.",
          recommendation: "Put the error next to the field, connect it with aria-describedby, and move focus to the first problem.",
          habit: "An error is a conversation. Point at the field, say what happened, say what to do next.",
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
