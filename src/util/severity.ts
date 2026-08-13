import type { Severity } from "../schema/finding.js";

const RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function severityRank(severity: Severity): number {
  return RANK[severity];
}

export function maxSeverity(values: Severity[]): Severity {
  return values.reduce((best, current) => (RANK[current] > RANK[best] ? current : best), "low");
}

export function meetsFailOn(severity: Severity, failOn: Severity): boolean {
  return RANK[severity] >= RANK[failOn];
}

export function axeImpactToSeverity(impact: string | null | undefined): Severity {
  switch (impact) {
    case "critical":
      return "critical";
    case "serious":
      return "high";
    case "moderate":
      return "medium";
    default:
      return "low";
  }
}
