import type { Page } from "playwright";

export interface A11yNode {
  role: string;
  name: string;
}

export interface TreeSummary {
  headings: Array<{ level: string; name: string }>;
  landmarks: string[];
  unlabeledControls: Array<{ role: string; selectorHint: string }>;
  imagesMissingName: number;
  liveRegions: number;
  snapshotText: string;
}

function unnamedFromAriaSnapshot(snapshotText: string): Array<{ role: string; selectorHint: string }> {
  const unlabeled: Array<{ role: string; selectorHint: string }> = [];
  const pattern = /^[\s]*- (button|link|textbox|checkbox|radio|combobox|searchbox|img|image)(?! ")/gm;
  for (const match of snapshotText.matchAll(pattern)) {
    const role = match[1];
    if (role) {
      unlabeled.push({ role, selectorHint: role });
    }
  }
  return unlabeled;
}

export async function summarizeAccessibilityTree(page: Page): Promise<TreeSummary> {
  let snapshotText = "";
  try {
    snapshotText = await page.locator("body").ariaSnapshot();
  } catch {
    snapshotText = "";
  }

  const fromDom = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((el) => ({
      level: el.tagName.toLowerCase(),
      name: (el.textContent || "").trim(),
    }));
    const landmarks: string[] = [];
    if (document.querySelector("header, [role='banner']")) landmarks.push("banner");
    if (document.querySelector("nav, [role='navigation']")) landmarks.push("navigation");
    if (document.querySelector("main, [role='main']")) landmarks.push("main");
    if (document.querySelector("footer, [role='contentinfo']")) landmarks.push("contentinfo");
    if (document.querySelector("aside, [role='complementary']")) landmarks.push("complementary");
    if (document.querySelector("form, [role='form']")) landmarks.push("form");
    if (document.querySelector("[role='search']")) landmarks.push("search");

    const unlabeledControls = Array.from(
      document.querySelectorAll("button, a[href], [role='button'], [role='link']"),
    )
      .map((el) => {
        const name = (
          el.getAttribute("aria-label") ||
          el.getAttribute("title") ||
          (el.textContent || "").replace(/\s+/g, " ").trim()
        ).trim();
        if (name) {
          return null;
        }
        return {
          role: el.getAttribute("role") || el.tagName.toLowerCase(),
          selectorHint: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
        };
      })
      .filter((row): row is { role: string; selectorHint: string } => Boolean(row));

    const imagesMissingName = Array.from(document.querySelectorAll("img")).filter((img) => {
      const alt = img.getAttribute("alt");
      return alt === null;
    }).length;

    const liveRegions = document.querySelectorAll("[aria-live], [role='status'], [role='alert']").length;
    return { headings, landmarks, unlabeledControls, imagesMissingName, liveRegions };
  });

  const unlabeledControls = [
    ...fromDom.unlabeledControls,
    ...unnamedFromAriaSnapshot(snapshotText).filter(
      (item) => !fromDom.unlabeledControls.some((existing) => existing.role === item.role),
    ),
  ];

  return {
    headings: fromDom.headings,
    landmarks: fromDom.landmarks,
    unlabeledControls,
    imagesMissingName: fromDom.imagesMissingName,
    liveRegions: fromDom.liveRegions,
    snapshotText,
  };
}

export async function headingOrderIssues(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const levels = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((el) =>
      Number(el.tagName.slice(1)),
    );
    const issues: string[] = [];
    if (!levels.includes(1)) {
      issues.push("Page has no h1.");
    }
    for (let i = 1; i < levels.length; i += 1) {
      const prev = levels[i - 1] ?? 1;
      const current = levels[i] ?? prev;
      if (current - prev > 1) {
        issues.push(`Heading level skipped from h${prev} to h${current}.`);
      }
    }
    return issues;
  });
}

export async function unlabeledFormControls(page: Page): Promise<Array<{ selector: string; reason: string }>> {
  return page.evaluate(() => {
    const controls = Array.from(document.querySelectorAll("input, select, textarea")).filter((el) => {
      const input = el as HTMLInputElement;
      return input.type !== "hidden" && input.type !== "submit" && input.type !== "button";
    });
    return controls
      .map((el) => {
        const input = el as HTMLInputElement;
        const id = input.id;
        const byFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        const wrapping = input.closest("label");
        const aria = input.getAttribute("aria-label") || input.getAttribute("aria-labelledby");
        const selector = input.id ? `#${input.id}` : input.name ? `[name="${input.name}"]` : input.tagName.toLowerCase();
        if (byFor || wrapping || aria) {
          return null;
        }
        return { selector, reason: "No associated label or accessible name" };
      })
      .filter((row): row is { selector: string; reason: string } => Boolean(row));
  });
}
