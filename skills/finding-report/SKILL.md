# Skill: finding-report

## Purpose
Normalize, deduplicate, cluster, and publish findings as JSON and Markdown.

## Contract
Every finding must include:
- agent, journey, step, category
- severity and confidence
- human-readable finding, impact, recommendation
- evidence artifact paths and/or axe payload

## Clustering
Findings that share category, axe rule or gist, and target are clustered so duplicate John/Deep/Asha observations appear once in the executive view.

## Outputs
- `reports/<runId>/report.json` (`schemaVersion` 1.0.0)
- `reports/<runId>/report.md`

## Implementation
`src/findings/engine.ts`, `src/report/write.ts`
