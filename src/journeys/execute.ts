import type { Page } from "playwright";
import { JourneyError } from "../errors.js";
import type { Logger } from "../logging.js";
import type { Journey, JourneyStep } from "../schema/report.js";

async function maybeClick(page: Page, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) {
      await locator.click({ force: true, timeout: 3_000 }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

export async function executeStep(page: Page, step: JourneyStep, log: Logger): Promise<void> {
  log.info("Executing journey step", { step: step.id, kind: step.kind });
  try {
    switch (step.kind) {
      case "explore":
        await page.waitForTimeout(150);
        return;
      case "open-navigation":
        await maybeClick(page, [
          step.selector ?? "",
          ".nav-toggle",
          ".hamburger",
          "button[aria-label*='menu' i]",
          "button:has-text('Menu')",
        ].filter(Boolean));
        return;
      case "enter-form": {
        const form = page.locator(step.selector ?? "form").first();
        if ((await form.count()) > 0) {
          const field = form.locator("input:visible, textarea:visible, select:visible").first();
          if ((await field.count()) > 0) {
            await field.focus();
          }
        }
        return;
      }
      case "submit-invalid": {
        if (step.selector) {
          await page.locator(step.selector).first().click({ timeout: 5_000 });
        } else {
          const submit = page.locator("form button[type='submit'], form input[type='submit'], form button:has-text('Pay'), form button:has-text('Submit')").first();
          if ((await submit.count()) > 0) {
            await submit.click({ timeout: 5_000 });
          }
        }
        await page.waitForTimeout(200);
        return;
      }
      case "open-dialog":
        await maybeClick(page, [
          step.selector ?? "",
          "button:has-text('Pay')",
          "button:has-text('Checkout')",
          "button:has-text('Open')",
          "[data-opens='dialog']",
        ].filter(Boolean));
        await page.waitForTimeout(200);
        return;
      case "complete-success":
        await maybeClick(page, [step.selector ?? "", "button:has-text('Confirm')", "button:has-text('Place order')"].filter(Boolean));
        return;
      case "click":
        if (!step.selector) {
          throw new JourneyError(`Step ${step.id} of kind click requires selector`);
        }
        await page.locator(step.selector).first().click({ timeout: step.timeoutMs ?? 5_000 });
        return;
      case "type":
        if (!step.selector || step.value === undefined) {
          throw new JourneyError(`Step ${step.id} of kind type requires selector and value`);
        }
        await page.locator(step.selector).first().fill(step.value);
        return;
      case "press":
        await page.keyboard.press(step.key ?? "Tab");
        return;
      case "wait":
        await page.waitForTimeout(step.timeoutMs ?? 500);
        return;
      default:
        throw new JourneyError(`Unsupported step kind: ${String((step as JourneyStep).kind)}`);
    }
  } catch (error) {
    if (error instanceof JourneyError) {
      throw error;
    }
    throw new JourneyError(`Failed to execute step ${step.id}`, error);
  }
}

export const DEFAULT_JOURNEY: Journey = {
  id: "primary-task",
  name: "Primary application task",
  description: "Default MVP journey covering landing, navigation, form, validation, dialog, and confirmation states.",
  steps: [
    { id: "landing", name: "Landing page", kind: "explore", scan: true },
    { id: "navigation", name: "Navigation open", kind: "open-navigation", scan: true },
    { id: "form", name: "Form entered", kind: "enter-form", scan: true },
    { id: "validation", name: "Validation error", kind: "submit-invalid", scan: true },
    { id: "dialog", name: "Dialog open", kind: "open-dialog", scan: true },
    { id: "success", name: "Success state", kind: "complete-success", scan: true },
  ],
};
