import type { Page } from "playwright";

export interface CognitiveSignals {
  competingPrimaryActions: string[];
  placeholderOnlyFields: number;
  animatedElements: number;
  autoUpdatingRegions: number;
  vagueButtons: string[];
  errorMessages: string[];
  errorsAssociated: boolean;
  instructionTextLength: number;
  uniqueButtonLabels: number;
}

const VAGUE = /^(ok|okay|submit|click here|here|continue|save|apply|yes|no|more|info)$/i;

export async function collectCognitiveSignals(page: Page): Promise<CognitiveSignals> {
  return page.evaluate((vagueSource) => {
    const vague = new RegExp(vagueSource, "i");
    const buttons = Array.from(document.querySelectorAll("button, [role='button'], input[type='submit'], a.button, .btn"));
    const labels = buttons
      .map((el) => (el.getAttribute("aria-label") || el.textContent || (el as HTMLInputElement).value || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const competingPrimaryActions = labels.filter((label) => /save|apply|continue|submit|pay|checkout|next/i.test(label));
    const vagueButtons = labels.filter((label) => vague.test(label));
    const placeholderOnlyFields = Array.from(document.querySelectorAll("input, textarea")).filter((el) => {
      const input = el as HTMLInputElement;
      if (!input.placeholder) return false;
      const id = input.id;
      const byFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      return !byFor && !input.closest("label") && !input.getAttribute("aria-label");
    }).length;
    const animatedElements = Array.from(document.querySelectorAll("*")).filter((el) => {
      const style = getComputedStyle(el);
      return (
        style.animationName !== "none" ||
        (style.transitionDuration !== "0s" && Number.parseFloat(style.transitionDuration) > 1)
      );
    }).length;
    const autoUpdatingRegions = document.querySelectorAll("[data-auto-rotate], marquee, .carousel, .ticker").length;
    const errorNodes = Array.from(document.querySelectorAll("[class*='error'], [role='alert'], .field-error"));
    const errorMessages = errorNodes.map((el) => (el.textContent || "").trim()).filter(Boolean).slice(0, 8);
    const errorsAssociated = errorNodes.every((el) => {
      const id = el.id;
      if (!id) return false;
      return Boolean(document.querySelector(`[aria-describedby~="${CSS.escape(id)}"]`));
    });
    const instruction = (document.querySelector("form")?.innerText || document.body.innerText || "").slice(0, 4000);
    return {
      competingPrimaryActions,
      placeholderOnlyFields,
      animatedElements,
      autoUpdatingRegions,
      vagueButtons,
      errorMessages,
      errorsAssociated: errorMessages.length === 0 ? true : errorsAssociated,
      instructionTextLength: instruction.length,
      uniqueButtonLabels: new Set(labels.map((label) => label.toLowerCase())).size,
    };
  }, VAGUE.source);
}
