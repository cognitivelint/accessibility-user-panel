import { z } from "zod";
import { FINDING_SCHEMA_VERSION } from "./versions.js";

export const AgentIdSchema = z.enum(["john", "deep", "sapna", "asha"]);
export type AgentId = z.infer<typeof AgentIdSchema>;

export const CategorySchema = z.enum([
  "keyboard",
  "screen-reader",
  "cognitive",
  "automated",
]);
export type Category = z.infer<typeof CategorySchema>;

export const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const AxeNodeSchema = z.object({
  html: z.string(),
  target: z.array(z.string()),
  failureSummary: z.string().optional(),
});

export const AxeEvidenceSchema = z.object({
  ruleId: z.string(),
  impact: z.string().nullable(),
  help: z.string(),
  helpUrl: z.string().optional(),
  tags: z.array(z.string()).default([]),
  nodes: z.array(AxeNodeSchema).default([]),
});
export type AxeEvidence = z.infer<typeof AxeEvidenceSchema>;

export const EvidenceSchema = z.object({
  axe: AxeEvidenceSchema.optional(),
  snapshotPath: z.string().optional(),
  screenshotPath: z.string().optional(),
  htmlSnippetPath: z.string().optional(),
  focusTracePath: z.string().optional(),
  ariaSnapshotPath: z.string().optional(),
  domContext: z.string().optional(),
  target: z.string().optional(),
  wcag: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const FindingSchema = z.object({
  schemaVersion: z.literal(FINDING_SCHEMA_VERSION),
  id: z.string().min(8),
  agent: AgentIdSchema,
  journey: z.string().min(1),
  step: z.string().min(1),
  category: CategorySchema,
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  finding: z.string().min(1),
  impact: z.string().min(1),
  recommendation: z.string().min(1),
  evidence: EvidenceSchema,
  tags: z.array(z.string()).default([]),
  reproducible: z.boolean().default(true),
});
export type Finding = z.infer<typeof FindingSchema>;

export const ClusterSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  agents: z.array(AgentIdSchema),
  categories: z.array(CategorySchema),
  memberIds: z.array(z.string()),
  journeys: z.array(z.string()),
  steps: z.array(z.string()),
});
export type Cluster = z.infer<typeof ClusterSchema>;
