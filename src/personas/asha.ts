import { runAxeScan } from "../skills/axe-scan.js";
import { axeImpactToSeverity } from "../util/severity.js";
import { createFinding, type ExplorationContext, type PersonaAgent } from "./types.js";
import type { Finding } from "../schema/finding.js";

export class AshaAuditorAgent implements PersonaAgent {
  readonly id = "asha" as const;

  async evaluate(ctx: ExplorationContext): Promise<Finding[]> {
    const scan = await runAxeScan(ctx.page, ctx.config.axeTags);
    const rawPath = ctx.evidence.json(`${ctx.journey.id}/${ctx.step.id}/asha-axe.json`, {
      url: scan.url,
      violationCount: scan.violations.length,
      incomplete: scan.incomplete,
      passes: scan.passes,
      violations: scan.violations,
    });

    const screenshotPath = ctx.evidence.write(
      `${ctx.journey.id}/${ctx.step.id}/asha-screenshot.png`,
      await ctx.page.screenshot({ fullPage: true }),
    );

    return scan.violations.flatMap((violation) => {
      const node = violation.nodes[0];
      const wcag = violation.tags.filter((tag) => tag.startsWith("wcag"));
      return [
        createFinding({
          agent: this.id,
          journey: ctx.journey.id,
          step: ctx.step.id,
          category: "automated",
          severity: axeImpactToSeverity(violation.impact),
          confidence: "high",
          finding: `${violation.ruleId}: ${violation.help}`,
          impact: `Deterministic axe-core violation at this UI state (${violation.nodes.length} node(s)).`,
          recommendation: violation.helpUrl
            ? `See ${violation.helpUrl} and remediate the listed nodes.`
            : "Remediate the listed nodes according to the axe-core guidance.",
          evidence: {
            axe: violation,
            screenshotPath,
            htmlSnippetPath: rawPath,
            target: node?.target.join(" ") ?? undefined,
            domContext: node?.html,
            wcag,
            notes: node?.failureSummary ? [node.failureSummary] : [],
          },
          tags: [violation.ruleId, ...violation.tags.slice(0, 4)],
        }),
      ];
    });
  }
}
