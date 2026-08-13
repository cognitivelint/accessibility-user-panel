import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "playwright";
import type { AxeEvidence } from "../schema/finding.js";

export interface AxeScanResult {
  url: string;
  violations: AxeEvidence[];
  incomplete: number;
  passes: number;
  raw: unknown;
}

export async function runAxeScan(page: Page, tags: string[]): Promise<AxeScanResult> {
  const builder = new AxeBuilder({ page }).withTags(tags);
  const raw = await builder.analyze();
  const violations: AxeEvidence[] = raw.violations.map((violation) => ({
    ruleId: violation.id,
    impact: violation.impact ?? null,
    help: violation.help,
    helpUrl: violation.helpUrl,
    tags: violation.tags,
    nodes: violation.nodes.map((node) => ({
      html: node.html,
      target: node.target.map(String),
      failureSummary: node.failureSummary,
    })),
  }));
  return {
    url: raw.url,
    violations,
    incomplete: raw.incomplete.length,
    passes: raw.passes.length,
    raw,
  };
}
