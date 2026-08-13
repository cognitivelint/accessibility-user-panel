import type { Page } from "playwright";
import { EvidenceStore } from "../evidence-store.js";
import { collapseRepeatedFindings, countByAgent, countBySeverity, dedupeFindings } from "../findings/engine.js";
import { createLogger } from "../logging.js";
import { resolveAgents } from "../personas/registry.js";
import type { AgentId, Finding } from "../schema/finding.js";
import type { Journey, JourneyStep, RunConfig } from "../schema/report.js";
import { slug } from "../util/ids.js";
import { buildModelPacket, type ModelPacket } from "./packet.js";
import { DEFAULT_PACKET_TOKEN_BUDGET } from "./tokens.js";
import { collectJsxA11yHits } from "../skills/jsx-a11y-collect.js";

export interface ScanStateOptions {
  page: Page;
  /** Existing Playwright test title — the journey is already mapped there. */
  test: string;
  /** Where you are in that test after the last action (dialog open, validation, …). */
  step: string;
  agents?: AgentId[];
  evidenceDir?: string;
  maxTabs?: number;
  axeTags?: string[];
  maxTokens?: number;
  projectRoot?: string;
}

const DEFAULT_AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

function syntheticConfig(options: ScanStateOptions): RunConfig {
  return {
    target: { url: options.page.url() || "http://127.0.0.1/" },
    agents: options.agents ?? ["asha", "deep", "sapna", "john"],
    output: { reportsDir: "reports", evidenceDir: options.evidenceDir ?? "evidence" },
    headless: true,
    failOn: "high",
    maxTabs: options.maxTabs ?? 40,
    navigationTimeoutMs: 30_000,
    axeTags: options.axeTags ?? DEFAULT_AXE_TAGS,
  };
}

/**
 * Drop this in after an existing Playwright test action — same place you would call axe.
 * Returns a token-capped packet for Cursor / Claude inbuilt models. Does not call an LLM API.
 */
export async function scanPlaywrightState(options: ScanStateOptions): Promise<{
  packet: ModelPacket;
  findingsCount: number;
}> {
  const config = syntheticConfig(options);
  const journey: Journey = {
    id: slug(options.test) || "test",
    name: options.test,
    steps: [{ id: slug(options.step) || "state", name: options.step, kind: "explore", scan: true }],
  };
  const step = journey.steps[0] as JourneyStep;
  const evidence = new EvidenceStore(config.output.evidenceDir, `pw-${Date.now()}`);
  const log = createLogger("error", { app: "aup-state" });
  const findings: Finding[] = [];
  const jsxA11y = collectJsxA11yHits(options.projectRoot ?? process.cwd()).hits;

  for (const persona of resolveAgents(config.agents)) {
    findings.push(
      ...(await persona.evaluate({
        page: options.page,
        config,
        journey,
        step,
        evidence,
        log: log.child({ agent: persona.id }),
        jsxA11y,
      })),
    );
  }

  const uniqueFindings = collapseRepeatedFindings(dedupeFindings(findings));
  const packet = buildModelPacket(
    {
      targetUrl: options.page.url() || config.target.url,
      findings: uniqueFindings,
      summary: {
        findingCount: uniqueFindings.length,
        clusterCount: 0,
        bySeverity: countBySeverity(uniqueFindings),
        byAgent: countByAgent(uniqueFindings, config.agents),
        journeysWithActionableEvidence: uniqueFindings.length > 0 ? 1 : 0,
        journeyCount: 1,
        keyboardBlocked: uniqueFindings.some((finding) => finding.agent === "john" && finding.severity === "critical"),
      },
      journeys: [{ journeyId: journey.id, completed: true, blockedAt: null, notes: [] }],
    },
    options.maxTokens ?? DEFAULT_PACKET_TOKEN_BUDGET,
  );

  return { packet, findingsCount: uniqueFindings.length };
}
