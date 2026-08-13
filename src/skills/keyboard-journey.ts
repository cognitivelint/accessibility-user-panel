import type { Page } from "playwright";

export interface FocusNode {
  focusId: string;
  tag: string;
  role: string | null;
  name: string;
  href: string | null;
  type: string | null;
  text: string;
  selector: string;
  visibleFocus: boolean;
  disabled: boolean;
  inDialog: boolean;
}

export interface KeyboardTrace {
  sequence: FocusNode[];
  cycled: boolean;
  skipLinkPresent: boolean;
  skipLinkWorked: boolean | null;
}

function readFocusNode(): FocusNode | null {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body || el === document.documentElement) {
    return null;
  }
  const win = window as unknown as { __aupFocusSeq?: number };
  win.__aupFocusSeq = win.__aupFocusSeq ?? 0;
  if (!el.dataset.aupFocusId) {
    win.__aupFocusSeq += 1;
    el.dataset.aupFocusId = String(win.__aupFocusSeq);
  }
  const style = getComputedStyle(el);
  const outlineWidth = Number.parseFloat(style.outlineWidth || "0");
  const hasOutline = style.outlineStyle !== "none" && outlineWidth > 0;
  const hasShadow = style.boxShadow !== "none" && style.boxShadow !== "";
  const name = (
    el.getAttribute("aria-label") ||
    el.getAttribute("alt") ||
    el.getAttribute("title") ||
    (el instanceof HTMLInputElement ? el.labels?.[0]?.textContent : "") ||
    el.textContent ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const inDialog = Boolean(el.closest("dialog, [role='dialog'], [aria-modal='true'], .modal"));
  let selector = el.tagName.toLowerCase();
  if (el.id) {
    selector += `#${el.id}`;
  } else if (el.getAttribute("data-testid")) {
    selector += `[data-testid="${el.getAttribute("data-testid")}"]`;
  } else if (typeof el.className === "string" && el.className.trim()) {
    selector += `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`;
  }
  return {
    focusId: el.dataset.aupFocusId,
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute("role"),
    name,
    href: el instanceof HTMLAnchorElement ? el.getAttribute("href") : null,
    type: el.getAttribute("type"),
    text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
    selector,
    visibleFocus: hasOutline || hasShadow,
    disabled: Boolean(el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true"),
    inDialog,
  };
}

export async function collectKeyboardTrace(page: Page, maxTabs: number): Promise<KeyboardTrace> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
  });

  const skipLinkPresent =
    (await page.locator('a[href^="#"], a.skip-link, .skip-link').first().count()) > 0;

  let skipLinkWorked: boolean | null = null;
  if (skipLinkPresent) {
    await page.keyboard.press("Tab");
    const first = await page.evaluate(readFocusNode);
    if (first?.href?.startsWith("#") || /skip/i.test(first?.name ?? "") || /skip/i.test(first?.text ?? "")) {
      await page.keyboard.press("Enter");
      skipLinkWorked = await page.evaluate(() => {
        const hash = location.hash.replace("#", "");
        if (!hash) {
          return document.activeElement !== document.body;
        }
        return Boolean(document.getElementById(hash));
      });
    }
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  }

  const sequence: FocusNode[] = [];
  const seen = new Map<string, number>();
  let cycled = false;

  for (let i = 0; i < maxTabs; i += 1) {
    await page.keyboard.press("Tab");
    const node = await page.evaluate(readFocusNode);
    if (!node) {
      continue;
    }
    const prior = seen.get(node.focusId);
    if (prior !== undefined && i - prior > 1) {
      cycled = true;
      break;
    }
    seen.set(node.focusId, i);
    sequence.push(node);
  }

  return { sequence, cycled, skipLinkPresent, skipLinkWorked };
}

export async function activeElement(page: Page): Promise<FocusNode | null> {
  return page.evaluate(readFocusNode);
}

export async function dialogOpen(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("dialog, [role='dialog'], [aria-modal='true'], .modal"));
    return nodes.some((node) => {
      if (node instanceof HTMLDialogElement) {
        return node.open;
      }
      const style = getComputedStyle(node);
      const visible = style.display !== "none" && style.visibility !== "hidden";
      return visible && node.classList.contains("open");
    });
  });
}
