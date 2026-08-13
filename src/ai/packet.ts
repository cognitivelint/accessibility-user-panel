import { z } from "zod";
import type { Finding, Report } from "../schema/index.js";
import { severityRank } from "../util/severity.js";
import {
  clip,
  DEFAULT_PACKET_TOKEN_BUDGET,
  estimateTokens,
  MAX_FELT_CHARS,
  MAX_HABIT_CHARS,
  MAX_PACKET_MOMENTS,
  MAX_TITLE_CHARS,
} from "./tokens.js";

export const ModelPacketSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  role: z.literal("aup-model-packet"),
  instruction:
    z.literal("Use only this packet. Do not open DOM, screenshots, or axe JSON. Do not re-run axe."),
  budget: z.object({
    maxTokens: z.number().int().positive(),
    usedTokens: z.number().int().nonnegative(),
    droppedMoments: z.number().int().nonnegative(),
  }),
  scene: z.object({
    url: z.string(),
    test: z.string(),
    blocked: z.boolean(),
  }),
  moments: z.array(
    z.object({
      who: z.enum(["john", "deep", "sapna", "asha"]),
      severity: z.enum(["critical", "high", "medium", "low"]),
      title: z.string(),
      felt: z.string(),
      habit: z.string(),
      at: z.string(),
      proof: z.string(),
    }),
  ),
});
export type ModelPacket = z.infer<typeof ModelPacketSchema>;

function proofOf(finding: Finding): string {
  if (finding.evidence.axe?.ruleId) {
    return `axe:${finding.evidence.axe.ruleId}`;
  }
  if (finding.evidence.target) {
    return clip(finding.evidence.target, 40);
  }
  return finding.category;
}

function toMoment(finding: Finding) {
  return {
    who: finding.agent,
    severity: finding.severity,
    title: clip(finding.finding, MAX_TITLE_CHARS),
    felt: clip(finding.livedMoment, MAX_FELT_CHARS),
    habit: clip(finding.habit, MAX_HABIT_CHARS),
    at: clip(`${finding.journey}/${finding.step}`, 48),
    proof: proofOf(finding),
  };
}

export function buildModelPacket(
  report: Pick<Report, "targetUrl" | "findings" | "summary" | "journeys">,
  maxTokens: number = DEFAULT_PACKET_TOKEN_BUDGET,
): ModelPacket {
  const ranked = [...report.findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  const moments: ModelPacket["moments"] = [];
  let droppedMoments = 0;

  const header = {
    schemaVersion: "1.0.0" as const,
    role: "aup-model-packet" as const,
    instruction: "Use only this packet. Do not open DOM, screenshots, or axe JSON. Do not re-run axe." as const,
    scene: {
      url: clip(report.targetUrl, 120),
      test: report.journeys.map((journey) => journey.journeyId).join(",") || "page",
      blocked: report.summary.keyboardBlocked,
    },
  };

  for (const finding of ranked) {
    if (moments.length >= MAX_PACKET_MOMENTS) {
      droppedMoments += 1;
      continue;
    }
    const candidate = [...moments, toMoment(finding)];
    const used = estimateTokens(JSON.stringify({ ...header, moments: candidate }));
    if (used > maxTokens) {
      droppedMoments += 1;
      continue;
    }
    moments.push(toMoment(finding));
  }

  const packet: ModelPacket = {
    ...header,
    budget: {
      maxTokens,
      usedTokens: 0,
      droppedMoments,
    },
    moments,
  };
  packet.budget.usedTokens = estimateTokens(JSON.stringify(packet));
  packet.budget.usedTokens = estimateTokens(JSON.stringify(packet));
  return ModelPacketSchema.parse(packet);
}

export function renderPacketMarkdown(packet: ModelPacket): string {
  const lines = [
    `# AUP packet (${packet.budget.usedTokens}/${packet.budget.maxTokens} tokens)`,
    "",
    packet.instruction,
    "",
    `Scene: ${packet.scene.test} @ ${packet.scene.url}${packet.scene.blocked ? " — keyboard blocked" : ""}`,
    "",
  ];
  if (packet.moments.length === 0) {
    lines.push("No moments in budget.", "");
    return lines.join("\n");
  }
  for (const moment of packet.moments) {
    lines.push(`- **${moment.who}** ${moment.severity}: ${moment.title} (${moment.at}; ${moment.proof})`);
    lines.push(`  ${moment.felt}`);
    lines.push(`  Habit: ${moment.habit}`);
  }
  if (packet.budget.droppedMoments > 0) {
    lines.push("", `_Dropped ${packet.budget.droppedMoments} lower-severity moment(s) to stay in budget._`);
  }
  lines.push("");
  return lines.join("\n");
}
