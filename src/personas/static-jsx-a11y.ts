import type { Finding } from "../schema/finding.js";
import { translateJsxA11y } from "../voice/jsx-a11y-stories.js";
import { createFinding, type ExplorationContext } from "./types.js";

const MAX_STATIC_PER_PERSONA = 4;

export function findingsFromJsxA11y(
  ctx: ExplorationContext,
  agent: "john" | "deep" | "sapna",
): Finding[] {
  const hits = ctx.jsxA11y ?? [];
  if (hits.length === 0) {
    return [];
  }
  const findings: Finding[] = [];
  for (const hit of hits) {
    const story = translateJsxA11y(agent, hit);
    if (!story) {
      continue;
    }
    const target = hit.line > 0 ? `${hit.file}:${hit.line}` : hit.file;
    findings.push(
      createFinding({
        agent,
        journey: ctx.journey.id,
        step: ctx.step.id,
        category: story.category,
        severity: story.severity,
        confidence: hit.severity === 2 ? "high" : "medium",
        finding: story.finding,
        livedMoment: story.livedMoment,
        habit: story.habit,
        impact: story.impact,
        recommendation: story.recommendation,
        evidence: {
          target,
          jsxA11y: {
            ruleId: hit.pluginRule,
            file: hit.file,
            line: hit.line,
            message: hit.message,
          },
          notes: [`${hit.pluginRule} ${target}`],
        },
        tags: ["jsx-a11y", hit.ruleId],
      }),
    );
    if (findings.length >= MAX_STATIC_PER_PERSONA) {
      break;
    }
  }
  return findings;
}
