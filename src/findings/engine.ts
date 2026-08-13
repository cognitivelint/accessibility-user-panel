import type { AgentId, Category, Cluster, Finding, Severity } from "../schema/finding.js";
import { stableId, unique } from "../util/ids.js";
import { maxSeverity, severityRank } from "../util/severity.js";

const CONFIDENCE_RANK: Record<Finding["confidence"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function clusterKey(finding: Finding): string {
  const axe = finding.evidence.axe?.ruleId ?? "";
  const target = finding.evidence.target ?? "";
  const gist = finding.finding.replace(/\d+/g, "#").slice(0, 80);
  return [finding.category, axe || gist, target.split(">>")[0]].join("|");
}

export function clusterFindings(findings: Finding[]): Cluster[] {
  const groups = new Map<string, Finding[]>();
  for (const finding of findings) {
    const key = clusterKey(finding);
    const list = groups.get(key) ?? [];
    list.push(finding);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([key, members]) => {
    const severity = maxSeverity(members.map((member) => member.severity));
    const confidence =
      members.sort((a, b) => CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence])[0]?.confidence ?? "low";
    return {
      id: stableId("cluster", key),
      title: members[0]?.finding ?? key,
      severity,
      confidence,
      agents: unique(members.map((member) => member.agent)) as AgentId[],
      categories: unique(members.map((member) => member.category)) as Category[],
      memberIds: members.map((member) => member.id),
      journeys: unique(members.map((member) => member.journey)),
      steps: unique(members.map((member) => member.step)),
    };
  });
}

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of findings) {
    counts[finding.severity] += 1;
  }
  return counts;
}

export function countByAgent(findings: Finding[], agents: AgentId[]): Record<AgentId, number> {
  const counts = Object.fromEntries(agents.map((agent) => [agent, 0])) as Record<AgentId, number>;
  for (const finding of findings) {
    counts[finding.agent] = (counts[finding.agent] ?? 0) + 1;
  }
  return counts;
}

export function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const result: Finding[] = [];
  for (const finding of findings) {
    if (seen.has(finding.id)) {
      continue;
    }
    seen.add(finding.id);
    result.push(finding);
  }
  return result;
}

/** Keep the first occurrence of the same issue when it repeats across journey steps. */
export function collapseRepeatedFindings(findings: Finding[]): Finding[] {
  const map = new Map<string, Finding>();
  for (const finding of findings) {
    const key = `${finding.agent}|${clusterKey(finding)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...finding, tags: [...finding.tags] });
      continue;
    }
    if (finding.step !== existing.step) {
      existing.tags = unique([...existing.tags, `also:${finding.step}`]);
    }
    if (severityRank(finding.severity) > severityRank(existing.severity)) {
      existing.severity = finding.severity;
    }
  }
  return [...map.values()];
}
