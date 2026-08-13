import { collectKeyboardTrace, dialogOpen } from "../skills/keyboard-journey.js";
import { findingsFromJsxA11y } from "./static-jsx-a11y.js";
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
          finding: "John has to walk the whole header before the real task",
          livedMoment:
            "John presses Tab. He is still in the banner: logo, utility links, maybe a ticker. There is no ‘skip to main content’ handshake. The work he came to do is several dozen keys away, every single time.",
          impact: "Repeated chrome becomes a tax on anyone who cannot point at the middle of the page.",
          recommendation: "Make the first Tab stop a skip link that moves focus into <main>.",
          habit: "If a page has a header, the first gift you give a keyboard is a way past it.",
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
          finding: "The skip link is a promise the page does not keep",
          livedMoment:
            "John finds a skip link, presses Enter, and nothing honest happens. Focus does not land on the main content. He is back to walking the header, a little less trusting.",
          impact: "A broken skip link is worse than none: it trains people that your shortcuts are decoration.",
          recommendation: "Point the skip link at an existing id on a focusable main heading or <main tabindex=\"-1\">.",
          habit: "Never ship a skip link you have not Tabbed through yourself.",
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
          finding: "John cannot see where he is on the page",
          livedMoment: `He is tabbing, but the ring is gone. ${missingVisibleFocus.length} control(s) swallow focus without a visible cue (including ${sample?.selector ?? "one of them"}). John is moving through a dark room, hoping he has not activated the wrong thing.`,
          impact: "Without a focus ring, keyboard use is guesswork and accidental activation.",
          recommendation: "Keep a strong :focus-visible outline or ring. Do not set outline: none unless you replace it with something clearer.",
          habit: "outline: none is not a polish step. If you remove the browser ring, you owe the user a better one.",
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
      const label = control.text ? `“${control.text}”` : `a ${control.tag}`;
      findings.push(
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "keyboard",
          severity: "critical",
          confidence: "high",
          finding: `John never reaches ${label} — it only exists for a pointer`,
          livedMoment: `John tabs the page. ${label} never lights up. It is a ${control.tag} that listens for a click, not for a key. The journey that depends on it is over for him, quietly, with no error message.`,
          impact: "Anyone who cannot use a mouse is locked out of this step. There is no workaround on the page.",
          recommendation: "Use a real <button> or <a href>. If you must use a custom element, it needs a keyboard path (Tab to it, Enter/Space to use it).",
          habit: "onclick on a div is a closed door. If it does something, it is a button.",
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
            finding: "A dialog opened, but John is still typing on the page underneath",
            livedMoment:
              "Something that looks like a payment sheet appears. John’s focus never enters it. He keeps tabbing the page behind the overlay — fields he cannot even see clearly — while the dialog waits for a mouse.",
            impact: "Keyboard users confirm, cancel, or type into the wrong place, or cannot complete checkout at all.",
            recommendation: "When the dialog opens, move focus to its title or first field. When it closes, send focus back to the control that opened it.",
            habit: "Opening a layer is a scene change. Take the user’s focus with you.",
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
            finding: "John can tab out of the dialog into the dimmed page",
            livedMoment:
              "He is in the payment dialog, then one more Tab and he is gone — behind the overlay, still hearing ‘clickable’ things he should not be able to reach until he is done here.",
            impact: "The modal is visual, not operational. People lose their place and activate hidden controls.",
            recommendation: "Keep focus inside the dialog until it is dismissed, and close it on Escape.",
            habit: "A dialog is a room. Do not leave the door swinging while the lights are off in the hallway.",
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
            finding: "Escape does not let John leave the overlay",
            livedMoment:
              "John presses Escape, the way every other dialog in his life works. This one stays. He has to hunt for a close control he may not be able to see or name.",
            impact: "Dismissing a layer becomes a puzzle instead of a reflex.",
            recommendation: "Handle Escape to close the dialog and restore focus to the trigger.",
            habit: "Escape means ‘I want out’. Honour it on every overlay.",
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
          finding: "Tab never lands on anything John can use",
          livedMoment:
            "John presses Tab again and again. Focus never arrives on a control. From his seat, this screen is not an interface — it is a poster.",
          impact: "The journey cannot start, let alone finish, from the keyboard.",
          recommendation: "Use native buttons, links, and inputs. Custom widgets must be reachable with Tab.",
          habit: "Load the page, put the mouse in a drawer, and try the task. If you cannot, neither can John.",
          evidence: { focusTracePath: tracePath, wcag: ["2.1.1"] },
        }),
      );
    }

    findings.push(...findingsFromJsxA11y(ctx, this.id));
    return findings;
  }
}
