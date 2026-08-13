import type { Page } from "playwright";
import type { EvidenceStore } from "../evidence/store.js";
import type { Logger } from "../logging.js";
import type { Finding } from "../schema/finding.js";
import type { Journey, JourneyStep, RunConfig } from "../schema/report.js";
import { FINDING_SCHEMA_VERSION } from "../schema/versions.js";
import { stableId } from "../util/ids.js";
import type { AgentId, Category, Confidence, Evidence, Severity } from "../schema/finding.js";

export interface ExplorationContext {
  page: Page;
  config: RunConfig;
  journey: Journey;
  step: JourneyStep;
  evidence: EvidenceStore;
  log: Logger;
}

export interface PersonaAgent {
  readonly id: AgentId;
  evaluate(ctx: ExplorationContext): Promise<Finding[]>;
}

export function createFinding(input: {
  agent: AgentId;
  journey: string;
  step: string;
  category: Category;
  severity: Severity;
  confidence: Confidence;
  finding: string;
  livedMoment: string;
  habit: string;
  impact: string;
  recommendation: string;
  evidence?: Partial<Evidence>;
  tags?: string[];
}): Finding {
  const evidence: Evidence = {
    wcag: [],
    notes: [],
    ...input.evidence,
  };
  return {
    schemaVersion: FINDING_SCHEMA_VERSION,
    id: stableId(input.agent, input.journey, input.step, input.category, input.finding, evidence.target),
    agent: input.agent,
    journey: input.journey,
    step: input.step,
    category: input.category,
    severity: input.severity,
    confidence: input.confidence,
    finding: input.finding,
    livedMoment: input.livedMoment,
    habit: input.habit,
    impact: input.impact,
    recommendation: input.recommendation,
    evidence,
    tags: input.tags ?? [],
    reproducible: true,
  };
}
