import { collectKeyboardTrace, dialogOpen } from "../skills/keyboard-journey.js";
import { createFinding, type ExplorationContext, type PersonaAgent } from "./types.js";
import type { Finding } from "../schema/finding.js";

export class JohnKeyboardAgent implements PersonaAgent {
  readonly id = "john" as const;

  async evaluate(ctx: ExplorationContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const trace = await collectKeyboardTrace(ctx.page, ctx.config.maxTabs);
    const tracePath = ctx.evidence.json(
      `${ctx.journey.id}/${ctx.step.id}/john-focus-trace.json`,
      trace,
    );

    if (!trace.skipLinkPresent) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "keyboard",
          severity: "medium",
          confidence: "high",
          finding: "No skip link is present at the start of the tab order.",
          impact: "A keyboard-only user must tab through repeated navigation before reaching main content.",
          recommendation: "Provide a skip link as the first focusable control that moves focus to main content.",
          evidence: { focusTracePath: tracePath, wcag: ["2.4.1"] },
          tags: ["skip-link", "navigation-efficiency"],
        }),
      );
    } else if (trace.skipLinkWorked === false) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "keyboard",
          severity: "high",
          confidence: "high",
          finding: "A skip link is present but does not move focus or viewport to its target.",
          impact: "Keyboard users cannot bypass repeated chrome even though a skip affordance exists.",
          recommendation: "Ensure the skip link href targets an existing id and that the target is focusable.",
          evidence: { focusTracePath: tracePath, wcag: ["2.4.1"] },
        }),
      );
    }

    const missingVisibleFocus = trace.sequence.filter((node) => !node.visibleFocus);
    if (missingVisibleFocus.length > 0) {
      const sample = missingVisibleFocus[0];
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "keyboard",
          severity: "high",
          confidence: "high",
          finding: `${missingVisibleFocus.length} focusable control(s) lack a visible focus indicator, including ${sample?.selector ?? "unknown"}.`,
          impact: "A keyboard-only user cannot tell which control is active.",
          recommendation: "Restore a high-contrast :focus-visible outline or ring on all interactive elements.",
          evidence: {
            focusTracePath: tracePath,
            target: sample?.selector,
            wcag: ["2.4.7"],
            notes: missingVisibleFocus.slice(0, 8).map((node) => node.selector),
          },
          tags: ["focus-visible"],
        }),
      );
    }

    const mouseOnly = await ctx.page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("[onclick], [data-opens], .nav-toggle, .hamburger"));
      return candidates
        .filter((el) => {
          const focusable =
            ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) ||
            (el as HTMLElement).tabIndex >= 0;
          return !focusable;
        })
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          className: (el as HTMLElement).className,
          text: (el.textContent || "").trim().slice(0, 60),
        }));
    });

    for (const control of mouseOnly) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "keyboard",
          severity: "critical",
          confidence: "high",
          finding: `Interactive ${control.tag}${control.className ? "." + String(control.className).split(" ").join(".") : ""} is not keyboard reachable.`,
          impact: "A keyboard-only user cannot operate this control or complete any journey that depends on it.",
          recommendation: "Use a native button or link, or add tabindex='0', a role, and keyboard event handling.",
          evidence: {
            focusTracePath: tracePath,
            target: control.className || control.tag,
            wcag: ["2.1.1"],
            notes: [control.text],
          },
          tags: ["keyboard-operable"],
        }),
      );
    }

    const open = await dialogOpen(ctx.page);
    if (open) {
      const inDialogCount = trace.sequence.filter((node) => node.inDialog).length;
      const outside = trace.sequence.filter((node) => !node.inDialog);
      if (inDialogCount === 0) {
        findings.push(
          createFinding({
            agent: this.id,
            journey: ctx.journey.id,
            step: ctx.step.id,
            category: "keyboard",
            severity: "high",
            confidence: "high",
            finding: "Keyboard focus remains on the underlying page after a dialog opens.",
            impact: "A keyboard-only user continues interacting with content behind the active modal.",
            recommendation: "Move focus into the dialog on open and restore it to the trigger on close.",
            evidence: { focusTracePath: tracePath, wcag: ["2.4.3"] },
            tags: ["dialog", "focus-management"],
          }),
        );
      } else if (outside.length > 0) {
        findings.push(
          createFinding({
            agent: this.id,
            journey: ctx.journey.id,
            step: ctx.step.id,
            category: "keyboard",
            severity: "high",
            confidence: "high",
            finding: "Tab order escapes the open dialog; focus is not trapped while the modal is active.",
            impact: "Keyboard users can leave the dialog while it still obscures the page, losing context.",
            recommendation: "Trap focus inside the modal until it is dismissed, and support Escape to close.",
            evidence: { focusTracePath: tracePath, wcag: ["2.4.3"] },
            tags: ["dialog", "focus-trap"],
          }),
        );
      }

      await ctx.page.keyboard.press("Escape");
      const stillOpen = await dialogOpen(ctx.page);
      if (stillOpen) {
        findings.push(
          createFinding({
            agent: this.id,
            journey: ctx.journey.id,
            step: ctx.step.id,
            category: "keyboard",
            severity: "medium",
            confidence: "high",
            finding: "The open dialog does not close when Escape is pressed.",
            impact: "Keyboard users have no consistent way to dismiss the overlay.",
            recommendation: "Handle the Escape key to close modal dialogs and restore focus.",
            evidence: { focusTracePath: tracePath, wcag: ["2.1.1"] },
            tags: ["dialog", "escape"],
          }),
        );
      } else {
        await ctx.page
          .locator("button:has-text('Pay'), button:has-text('Checkout'), [data-opens='dialog']")
          .first()
          .click({ timeout: 2_000 })
          .catch(() => undefined);
      }
    }

    if (trace.sequence.length === 0) {
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "keyboard",
          severity: "critical",
          confidence: "high",
          finding: "No keyboard-focusable controls were reached while tabbing this state.",
          impact: "A keyboard-only user cannot operate the interface at this journey step.",
          recommendation: "Ensure interactive controls are native focusable elements or have tabindex='0'.",
          evidence: { focusTracePath: tracePath, wcag: ["2.1.1"] },
        }),
      );
    }

    return findings;
  }
}
