import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildModelPacket, renderPacketMarkdown } from "../ai/packet.js";
import { DEFAULT_PACKET_TOKEN_BUDGET } from "../ai/tokens.js";
import type { AgentId, Finding } from "../schema/finding.js";
import type { Report } from "../schema/report.js";
import { unique } from "../util/ids.js";
import { humanSeverity, PERSONA_VOICE } from "../voice/personas.js";

function findingsFor(report: Report, agent: AgentId): Finding[] {
  return report.findings.filter((finding) => finding.agent === agent);
}

function artifacts(finding: Finding): string[] {
  return [
    finding.evidence.screenshotPath,
    finding.evidence.ariaSnapshotPath,
    finding.evidence.focusTracePath,
    finding.evidence.snapshotPath,
    finding.evidence.htmlSnippetPath,
  ].filter((path): path is string => Boolean(path));
}

function renderFinding(finding: Finding): string[] {
  const voice = PERSONA_VOICE[finding.agent];
  const also = finding.tags.filter((tag) => tag.startsWith("also:")).map((tag) => tag.slice(5));
  const steps = [finding.step, ...also];
  const lines = [
    `### ${finding.finding}`,
    "",
    `*${humanSeverity(finding.severity)}* · ${voice.name} · during **${steps.join(", ")}**`,
    "",
    finding.livedMoment,
    "",
    `**What that meant:** ${finding.impact}`,
    "",
    `**What to change:** ${finding.recommendation}`,
    "",
    `**A habit to keep:** ${finding.habit}`,
    "",
  ];

  const evidenceBits: string[] = [];
  if (finding.evidence.target) {
    evidenceBits.push(`Where in the UI: \`${finding.evidence.target}\``);
  }
  if (finding.evidence.axe) {
    evidenceBits.push(
      `Asha’s checker recorded \`${finding.evidence.axe.ruleId}\` (${finding.evidence.axe.help}) — kept here as proof, not as the message.`,
    );
  }
  const files = artifacts(finding);
  if (files.length > 0) {
    evidenceBits.push(`Files: ${files.map((path) => `\`${path}\``).join(", ")}`);
  }
  if (evidenceBits.length > 0) {
    lines.push("<details>", "<summary>Proof, for when you open the editor</summary>", "", ...evidenceBits.map((bit) => `- ${bit}`), "", "</details>", "");
  }
  return lines;
}

export function renderMarkdownReport(report: Report): string {
  const blocked = report.journeys.filter((journey) => !journey.completed);
  const lines: string[] = [
    `# How this page felt`,
    "",
    "This is not a dump of rule IDs. It is what happened when people tried to finish a real task.",
    "",
    `- ${PERSONA_VOICE.john.name} ${PERSONA_VOICE.john.how}.`,
    `- ${PERSONA_VOICE.deep.name} ${PERSONA_VOICE.deep.how}.`,
    `- ${PERSONA_VOICE.sapna.name} ${PERSONA_VOICE.sapna.how}.`,
    `- ${PERSONA_VOICE.asha.name} ${PERSONA_VOICE.asha.how}.`,
    "",
    `They walked **${report.targetUrl}** on ${report.generatedAt}.`,
    "",
  ];

  lines.push("## The journey in one breath", "");
  for (const journey of report.journeys) {
    if (journey.completed) {
      lines.push(`- **${journey.journeyId}** — they could complete the path. Friction below is still worth the habit.`);
    } else {
      lines.push(
        `- **${journey.journeyId}** — someone was stopped at **${journey.blockedAt ?? "an early step"}**. ${journey.notes[0] ?? "See John’s notes."}`,
      );
    }
  }
  lines.push("");

  if (blocked.length > 0) {
    lines.push(
      "> If you only fix one thing, fix whatever stopped John. A person who cannot reach the control cannot benefit from a better label on it.",
      "",
    );
  }

  const order: AgentId[] = ["john", "deep", "sapna", "asha"];
  for (const agent of order) {
    if (!report.agents.includes(agent)) {
      continue;
    }
    const owned = findingsFor(report, agent);
    const voice = PERSONA_VOICE[agent];
    lines.push(`## ${voice.name}`, "", `_${voice.how}_`, "");
    if (owned.length === 0) {
      lines.push(`Nothing from ${voice.name} on this run. That is worth celebrating — and worth keeping.`, "");
      continue;
    }
    for (const finding of owned) {
      lines.push(...renderFinding(finding));
    }
  }

  const habits = unique(report.findings.map((finding) => finding.habit));
  lines.push("## What to remember the next time you write UI", "");
  lines.push(
    "The point of this panel is not a clean scan. It is that next week, when you reach for a `div` with `onclick`, or a placeholder instead of a label, these people show up in your head.",
    "",
  );
  for (const habit of habits) {
    lines.push(`- ${habit}`);
  }
  lines.push("");

  lines.push(
    "---",
    "",
    "Automated rules tell us what may be wrong. Simulated perspectives help us understand why it matters.",
    "",
    "This briefing is not a WCAG certificate and does not replace testing with people who use assistive technologies.",
    "",
  );
  return lines.join("\n");
}

export function renderCliBriefing(report: Report): string {
  const stopped = report.journeys.filter((journey) => !journey.completed);
  const lead =
    stopped.length > 0
      ? `Someone could not finish ${stopped.map((journey) => journey.journeyId).join(", ")}.`
      : `The journeys completed. ${report.summary.findingCount} moment(s) are still worth the habit.`;
  const first = report.findings[0];
  const sample = first ? `${PERSONA_VOICE[first.agent].name}: ${first.finding}` : "No findings.";
  const habits = unique(report.findings.map((finding) => finding.habit)).slice(0, 3);
  return [
    lead,
    sample,
    ...habits.map((habit) => `Remember: ${habit}`),
  ].join("\n");
}

export function writeReports(report: Report, reportsDir: string): {
  jsonPath: string;
  markdownPath: string;
  packetPath: string;
  packetMarkdownPath: string;
  packetTokens: number;
} {
  const dir = resolve(reportsDir, report.runId);
  mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, "report.json");
  const markdownPath = join(dir, "report.md");
  const packet = buildModelPacket(report, DEFAULT_PACKET_TOKEN_BUDGET);
  const packetPath = join(dir, "packet.json");
  const packetMarkdownPath = join(dir, "packet.md");
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownPath, renderMarkdownReport(report));
  writeFileSync(packetPath, `${JSON.stringify(packet)}\n`);
  writeFileSync(packetMarkdownPath, renderPacketMarkdown(packet));
  return { jsonPath, markdownPath, packetPath, packetMarkdownPath, packetTokens: packet.budget.usedTokens };
}
