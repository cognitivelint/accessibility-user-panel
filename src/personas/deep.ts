import {
  headingOrderIssues,
  summarizeAccessibilityTree,
  unlabeledFormControls,
} from "../skills/accessibility-tree.js";
import { dialogOpen } from "../skills/keyboard-journey.js";
import { createFinding, type ExplorationContext, type PersonaAgent } from "./types.js";
import type { Finding } from "../schema/finding.js";

export class DeepScreenReaderAgent implements PersonaAgent {
  readonly id = "deep" as const;

  async evaluate(ctx: ExplorationContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const tree = await summarizeAccessibilityTree(ctx.page);
    const snapshotPath = ctx.evidence.text(
      `${ctx.journey.id}/${ctx.step.id}/deep-aria-snapshot.md`,
      tree.snapshotText,
    );

    if (!tree.landmarks.includes("main") && !tree.landmarks.includes("banner")) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "screen-reader",
          severity: "medium",
          confidence: "high",
          finding: "The accessibility tree does not expose standard landmarks such as main or banner.",
          impact: "A screen-reader user cannot jump to primary regions and must linearize the entire page.",
          recommendation: "Use semantic elements (header, nav, main, footer) or explicit landmark roles.",
          evidence: { ariaSnapshotPath: snapshotPath, wcag: ["1.3.1", "2.4.1"] },
          tags: ["landmarks"],
        }),
      );
    }

    for (const issue of await headingOrderIssues(ctx.page)) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "screen-reader",
          severity: "medium",
          confidence: "high",
          finding: issue,
          impact: "Heading navigation no longer maps to the visual or logical document outline.",
          recommendation: "Start with a single h1 and do not skip heading levels.",
          evidence: { ariaSnapshotPath: snapshotPath, wcag: ["1.3.1", "2.4.6"] },
          tags: ["headings"],
        }),
      );
    }

    for (const control of tree.unlabeledControls.slice(0, 12)) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "screen-reader",
          severity: control.role === "button" ? "high" : "medium",
          confidence: "high",
          finding: `A ${control.role} in the accessibility tree has no accessible name.`,
          impact: "A screen-reader user can reach the control but cannot determine its purpose.",
          recommendation: "Provide a visible label, aria-label, or associated label element.",
          evidence: { ariaSnapshotPath: snapshotPath, target: control.selectorHint, wcag: ["4.1.2"] },
          tags: ["accessible-name"],
        }),
      );
    }

    for (const field of await unlabeledFormControls(ctx.page)) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "screen-reader",
          severity: "high",
          confidence: "high",
          finding: `Form control ${field.selector} has no programmatic label.`,
          impact: "Screen-reader users hear an unlabeled input and cannot complete the form reliably.",
          recommendation: "Associate a label via for/id, wrapping label, or aria-labelledby.",
          evidence: { ariaSnapshotPath: snapshotPath, target: field.selector, wcag: ["1.3.1", "3.3.2"] },
          tags: ["forms"],
        }),
      );
    }

    if (tree.imagesMissingName > 0) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "screen-reader",
          severity: "medium",
          confidence: "high",
          finding: `${tree.imagesMissingName} image(s) expose no accessible name.`,
          impact: "Meaningful images are silent or announced only as 'image'.",
          recommendation: "Add concise alt text, or alt='' when the image is decorative.",
          evidence: { ariaSnapshotPath: snapshotPath, wcag: ["1.1.1"] },
          tags: ["images"],
        }),
      );
    }

    if (await dialogOpen(ctx.page)) {
      const dialogName = await ctx.page.evaluate(() => {
        const dialog = document.querySelector("dialog, [role='dialog'], [aria-modal='true'], .modal");
        if (!dialog) return null;
        return dialog.getAttribute("aria-label") || dialog.getAttribute("aria-labelledby") || "";
      });
      if (!dialogName) {
        findings.push(
          createFinding({
            agent: this.id,
            journey: ctx.journey.id,
            step: ctx.step.id,
            category: "screen-reader",
            severity: "high",
            confidence: "high",
            finding: "The open dialog is not named in the accessibility tree.",
            impact: "Screen-reader users enter an unlabeled overlay and cannot identify the task.",
            recommendation: "Give the dialog role='dialog', aria-modal='true', and aria-labelledby pointing at its title.",
            evidence: { ariaSnapshotPath: snapshotPath, wcag: ["4.1.2"] },
            tags: ["dialog"],
          }),
        );
      }
      if (tree.liveRegions === 0 && ctx.step.kind === "complete-success") {
        findings.push(
          createFinding({
            agent: this.id,
            journey: ctx.journey.id,
            step: ctx.step.id,
            category: "screen-reader",
            severity: "medium",
            confidence: "medium",
            finding: "No live region is present to announce a success or status change.",
            impact: "Dynamic confirmation may be missed unless the user re-reads the page.",
            recommendation: "Announce status with role='status' or aria-live='polite'.",
            evidence: { ariaSnapshotPath: snapshotPath, wcag: ["4.1.3"] },
            tags: ["live-region"],
          }),
        );
      }
    }

    return findings;
  }
}
