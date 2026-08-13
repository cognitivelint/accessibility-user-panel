import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Report } from "../schema/report.js";

function mdEscape(value: string): string {
  return value.replace(/\|/g, "\\|");
}

export function renderMarkdownReport(report: Report): string {
  const lines: string[] = [
    `# Accessibility User Panel Report`,
    "",
    `- Generated: ${report.generatedAt}`,
    `- Run: \`${report.runId}\``,
    `- Target: ${report.targetUrl}`,
    `- Agents: ${report.agents.join(", ")}`,
    `- Findings: ${report.summary.findingCount} (${report.summary.clusterCount} clusters)`,
    `- Keyboard blocked: ${report.summary.keyboardBlocked ? "yes" : "no"}`,
    "",
    "## Summary by severity",
    "",
    "| Severity | Count |",
    "| --- | ---: |",
    ...Object.entries(report.summary.bySeverity).map(([severity, count]) => `| ${severity} | ${count} |`),
    "",
    "## Journeys",
    "",
    "| Journey | Completed | Blocked at |",
    "| --- | --- | --- |",
    ...report.journeys.map(
      (journey) =>
        `| ${mdEscape(journey.journeyId)} | ${journey.completed ? "yes" : "no"} | ${mdEscape(journey.blockedAt ?? "—")} |`,
    ),
    "",
    "## Clustered findings",
    "",
  ];

  for (const cluster of report.clusters) {
    lines.push(`### ${cluster.severity.toUpperCase()} — ${cluster.title}`);
    lines.push("");
    lines.push(`- Agents: ${cluster.agents.join(", ")}`);
    lines.push(`- Confidence: ${cluster.confidence}`);
    lines.push(`- Journeys: ${cluster.journeys.join(", ")} @ ${cluster.steps.join(", ")}`);
    lines.push(`- Members: ${cluster.memberIds.length}`);
    lines.push("");
  }

  lines.push("## Finding details", "");
  for (const finding of report.findings) {
    lines.push(`### ${finding.severity.toUpperCase()} / ${finding.agent} / ${finding.id}`);
    lines.push("");
    lines.push(finding.finding);
    lines.push("");
    lines.push(`- Journey step: \`${finding.journey}\` / \`${finding.step}\``);
    lines.push(`- Category: ${finding.category}`);
    lines.push(`- Confidence: ${finding.confidence}`);
    lines.push(`- Impact: ${finding.impact}`);
    lines.push(`- Recommendation: ${finding.recommendation}`);
    if (finding.evidence.target) {
      lines.push(`- Target: \`${finding.evidence.target}\``);
    }
    if (finding.evidence.axe) {
      lines.push(`- axe-core: \`${finding.evidence.axe.ruleId}\` (${finding.evidence.axe.help})`);
    }
    const artifacts = [
      finding.evidence.screenshotPath,
      finding.evidence.ariaSnapshotPath,
      finding.evidence.focusTracePath,
      finding.evidence.snapshotPath,
      finding.evidence.htmlSnippetPath,
    ].filter(Boolean);
    if (artifacts.length > 0) {
      lines.push(`- Evidence: ${artifacts.map((path) => `\`${path}\``).join(", ")}`);
    }
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "_Automated rules tell us what may be wrong. Simulated perspectives help us understand why it matters._",
    "",
    "This report is not a WCAG certification and does not replace testing with people who use assistive technologies.",
    "",
  );
  return lines.join("\n");
}

export function writeReports(report: Report, reportsDir: string): { jsonPath: string; markdownPath: string } {
  const dir = resolve(reportsDir, report.runId);
  mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, "report.json");
  const markdownPath = join(dir, "report.md");
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownPath, renderMarkdownReport(report));
  return { jsonPath, markdownPath };
}
