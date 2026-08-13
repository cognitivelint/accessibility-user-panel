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
          finding: "Deep cannot jump to the heart of the page",
          livedMoment:
            "He asks for landmarks — the rooms of the page — and the list is empty of a main stage. He has to listen from the top, through everything, to find the task.",
          impact: "Every visit costs extra time. There is no map, only a stream.",
          recommendation: "Use <header>, <nav>, <main>, and <footer> (or matching landmark roles) so Deep can skip around.",
          habit: "Build the page as rooms, not a pile of divs. Main is the room where the work happens.",
          evidence: { ariaSnapshotPath: snapshotPath, wcag: ["1.3.1", "2.4.1"] },
          tags: ["landmarks"],
        }),
      );
    }

    for (const issue of await headingOrderIssues(ctx.page)) {
      const noH1 = issue.includes("no h1");
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "screen-reader",
          severity: "medium",
          confidence: "high",
          finding: noH1
            ? "The page never names itself as a heading"
            : "The heading outline skips a beat",
          livedMoment: noH1
            ? "Deep opens the heading list to learn where he is. There is no h1. The document has no front door — only smaller signs further in."
            : `Deep walks the outline and the levels jump (${issue}) so the story of the page no longer matches what he hears.`,
          impact: "Heading navigation stops being a table of contents.",
          recommendation: "One h1 that names the task, then honest h2/h3. Style size with CSS, not with heading level.",
          habit: "Write the outline first. If you would not skip a chapter number in a book, do not skip a heading level on a page.",
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
          finding: "Deep hears a control that never introduces itself",
          livedMoment: `He reaches a ${control.role} and the page says nothing else — not a name, not a purpose. At “${ctx.step.id}” he knows something is there, and not what it will do if he activates it.`,
          impact: "People who cannot see the icon have to guess, skip, or risk the wrong action.",
          recommendation: "Give it visible text, or a short name that matches the action. Prefer a visible label over a hidden one.",
          habit: "Read every control out loud. If you sound silly saying only ‘button’, the page is not finished.",
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
          finding: "A field never says what it is for",
          livedMoment: `Deep arrives at ${field.selector}. He hears that it is editable, and not whether it wants an email, a card, a name. The visual caption — if there is one — was never connected to the field, so it does not travel with him.`,
          impact: "Forms that look obvious on screen become a blank quiz when you can only listen.",
          recommendation: "Tie a visible <label> to the field (for/id or wrap the input). Do not rely on placeholder as the name.",
          habit: "A field without a label is a question you asked and then covered with your hand.",
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
          finding: "Pictures on this step stay silent",
          livedMoment: `${tree.imagesMissingName} image(s) announce themselves as ‘image’ and then go quiet. If they carry a product, a warning, or a brand, that meaning never arrives.`,
          impact: "Visual meaning is missing for anyone who does not see the file.",
          recommendation: "Write a short alt that carries the meaning. If it is purely decorative, alt=\"\" lets Deep skip it.",
          habit: "If you would mention the picture in a standup, it needs alt text.",
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
            finding: "A dialog opens without saying its name",
            livedMoment:
              "A layer takes over. Deep hears that a dialog is there, and not whether it is ‘Confirm $42’, ‘Are you sure?’, or something else. He has entered a room with no sign on the door.",
            impact: "People cancel, guess, or leave the flow rather than act inside an unnamed overlay.",
            recommendation: "Give the dialog a visible title and point aria-labelledby at it. role=\"dialog\" and aria-modal=\"true\" help too.",
            habit: "Every overlay is a scene. Title the scene.",
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
            finding: "Success happens in silence",
            livedMoment:
              "The order is placed, or so the screen suggests. Nothing is announced. Deep is still focused where he was, with no one telling him it worked.",
            impact: "People repeat the action, or sit uncertain, because confirmation never reached them.",
            recommendation: "Announce the outcome with a polite live region (role=\"status\").",
            habit: "If the UI changed, say so. Visual checkmarks do not make a sound.",
            evidence: { ariaSnapshotPath: snapshotPath, wcag: ["4.1.3"] },
            tags: ["live-region"],
          }),
        );
      }
    }

    return findings;
  }
}
