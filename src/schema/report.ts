import { z } from "zod";
import { AgentIdSchema, ClusterSchema, FindingSchema, SeveritySchema } from "./finding.js";
import { REPORT_SCHEMA_VERSION } from "./versions.js";

export const JourneyStepKindSchema = z.enum([
  "explore",
  "open-navigation",
  "enter-form",
  "submit-invalid",
  "open-dialog",
  "complete-success",
  "click",
  "type",
  "press",
  "wait",
]);
export type JourneyStepKind = z.infer<typeof JourneyStepKindSchema>;

export const JourneyStepSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: JourneyStepKindSchema,
  selector: z.string().optional(),
  value: z.string().optional(),
  key: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  scan: z.boolean().default(true),
});
export type JourneyStep = z.infer<typeof JourneyStepSchema>;

export const JourneySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  startUrl: z.string().optional(),
  steps: z.array(JourneyStepSchema).min(1),
});
export type Journey = z.infer<typeof JourneySchema>;

export const TargetConfigSchema = z.object({
  url: z.string().url(),
  storageState: z.string().optional(),
  extraHttpHeaders: z.record(z.string(), z.string()).optional(),
  viewport: z
    .object({
      width: z.number().int().positive().default(1280),
      height: z.number().int().positive().default(720),
    })
    .optional(),
});

export const OutputConfigSchema = z.object({
  reportsDir: z.string().default("reports"),
  evidenceDir: z.string().default("evidence"),
});

export const RunConfigSchema = z.object({
  target: TargetConfigSchema,
  journeys: z.array(JourneySchema).optional(),
  agents: z.array(AgentIdSchema).default(["asha", "deep", "sapna", "john"]),
  output: OutputConfigSchema.default({ reportsDir: "reports", evidenceDir: "evidence" }),
  headless: z.boolean().default(true),
  failOn: SeveritySchema.default("high"),
  maxTabs: z.number().int().positive().default(60),
  navigationTimeoutMs: z.number().int().positive().default(30_000),
  axeTags: z.array(z.string()).default(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]),
});
export type RunConfig = z.infer<typeof RunConfigSchema>;

export const JourneyOutcomeSchema = z.object({
  journeyId: z.string(),
  completed: z.boolean(),
  blockedAt: z.string().nullable(),
  notes: z.array(z.string()).default([]),
});

export const ReportSchema = z.object({
  schemaVersion: z.literal(REPORT_SCHEMA_VERSION),
  generatedAt: z.string(),
  runId: z.string(),
  targetUrl: z.string(),
  agents: z.array(AgentIdSchema),
  summary: z.object({
    findingCount: z.number().int().nonnegative(),
    clusterCount: z.number().int().nonnegative(),
    bySeverity: z.record(SeveritySchema, z.number()),
    byAgent: z.record(AgentIdSchema, z.number()),
    journeysWithActionableEvidence: z.number().int().nonnegative(),
    journeyCount: z.number().int().nonnegative(),
    keyboardBlocked: z.boolean(),
  }),
  journeys: z.array(JourneyOutcomeSchema),
  findings: z.array(FindingSchema),
  clusters: z.array(ClusterSchema),
  evidenceRoot: z.string(),
});
export type Report = z.infer<typeof ReportSchema>;
