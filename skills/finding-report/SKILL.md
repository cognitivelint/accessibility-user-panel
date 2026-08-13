# Skill: finding-report

## Purpose
Turn exploration into a briefing a developer can feel — then keep JSON for machines.

## Voice
Lead with the person and the moment. Never headline a finding with a rule ID or “aria-label missing”.
Asha’s checker output is proof, folded under details.

Every finding must include:
- agent, journey, step, category
- severity and confidence
- `finding` (plain language title)
- `livedMoment` (what it felt like)
- `impact`, `recommendation`
- `habit` (what to remember the next time they write UI)
- evidence artifact paths and/or axe payload

## Clustering
Collapse the same issue across journey steps. Cluster related observations from multiple agents.

## Outputs
- `reports/<runId>/report.md` — the briefing
- `reports/<runId>/report.json` (`schemaVersion` 1.1.0)

## Implementation
`src/findings/engine.ts`, `src/report/write.ts`, `src/voice/`
