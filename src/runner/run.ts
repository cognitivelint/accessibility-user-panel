import { randomUUID } from "node:crypto";
import { BrowserSession } from "../browser/session.js";
import { EvidenceStore } from "../evidence/store.js";
import { clusterFindings, countByAgent, countBySeverity, dedupeFindings } from "../findings/engine.js";
import { DEFAULT_JOURNEY, executeStep } from "../journeys/execute.js";
import type { Logger } from "../logging.js";
import { resolveAgents } from "../personas/registry.js";
import { writeReports } from "../report/write.js";
import type { Finding } from "../schema/finding.js";
import type { Journey, Report, RunConfig } from "../schema/report.js";
import { REPORT_SCHEMA_VERSION } from "../schema/versions.js";
import { nowIso } from "../util/ids.js";
import { meetsFailOn } from "../util/severity.js";

export interface RunResult {
  report: Report;
  jsonPath: string;
  markdownPath: string;
  exitCode: number;
}

export async function runAccessibilityPanel(config: RunConfig, log: Logger): Promise<RunResult> {
  const runId = nowIso().replace(/[:.]/g, "-") + "-" + randomUUID().slice(0, 8);
  const evidence = new EvidenceStore(config.output.evidenceDir, runId);
  const session = await BrowserSession.launch(config, log);
  const personas = resolveAgents(config.agents);
  const journeys: Journey[] = config.journeys?.length ? config.journeys : [DEFAULT_JOURNEY];
  const findings: Finding[] = [];
  const outcomes: Report["journeys"] = [];

  try {
    for (const journey of journeys) {
      const journeyLog = log.child({ journey: journey.id });
      await session.goto(journey.startUrl ?? config.target.url);
      let blockedAt: string | null = null;
      const notes: string[] = [];

      for (const step of journey.steps) {
        try {
          await executeStep(session.page, step, journeyLog);
        } catch (error) {
          blockedAt = step.id;
          notes.push(error instanceof Error ? error.message : String(error));
          journeyLog.warn("Journey step failed", { step: step.id, error: notes.at(-1) });
        }

        if (!step.scan) {
          continue;
        }

        const html = await session.page.content();
        evidence.text(`${journey.id}/${step.id}/dom.html`, html.slice(0, 200_000));

        for (const persona of personas) {
          const personaLog = journeyLog.child({ agent: persona.id, step: step.id });
          personaLog.info("Evaluating persona");
          try {
            const produced = await persona.evaluate({
              page: session.page,
              config,
              journey,
              step,
              evidence,
              log: personaLog,
            });
            findings.push(...produced);
          } catch (error) {
            personaLog.error("Persona evaluation failed", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const johnBlock = findings.find(
          (finding) =>
            finding.agent === "john" &&
            finding.journey === journey.id &&
            finding.step === step.id &&
            (finding.severity === "critical" || finding.tags.includes("keyboard-operable")),
        );
        if (johnBlock && !blockedAt) {
          blockedAt = step.id;
          notes.push(johnBlock.finding);
        }
      }

      outcomes.push({
        journeyId: journey.id,
        completed: blockedAt === null,
        blockedAt,
        notes,
      });
    }
  } finally {
    await session.close();
  }

  const uniqueFindings = dedupeFindings(findings);
  const clusters = clusterFindings(uniqueFindings);
  const bySeverity = countBySeverity(uniqueFindings);
  const keyboardBlocked = outcomes.some((outcome) => outcome.blockedAt !== null && uniqueFindings.some((finding) => finding.agent === "john" && finding.journey === outcome.journeyId && finding.severity === "critical"));

  const report: Report = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: nowIso(),
    runId,
    targetUrl: config.target.url,
    agents: config.agents,
    summary: {
      findingCount: uniqueFindings.length,
      clusterCount: clusters.length,
      bySeverity,
      byAgent: countByAgent(uniqueFindings, config.agents),
      journeysWithActionableEvidence: outcomes.filter((outcome) =>
        uniqueFindings.some((finding) => finding.journey === outcome.journeyId && finding.evidence),
      ).length,
      journeyCount: journeys.length,
      keyboardBlocked,
    },
    journeys: outcomes,
    findings: uniqueFindings,
    clusters,
    evidenceRoot: evidence.root,
  };

  const paths = writeReports(report, config.output.reportsDir);
  const shouldFail = uniqueFindings.some((finding) => meetsFailOn(finding.severity, config.failOn));
  log.info("Run complete", {
    runId,
    findings: uniqueFindings.length,
    clusters: clusters.length,
    jsonPath: paths.jsonPath,
  });

  return {
    report,
    jsonPath: paths.jsonPath,
    markdownPath: paths.markdownPath,
    exitCode: shouldFail ? 1 : 0,
  };
}
