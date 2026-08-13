# Architecture

## Principle

Automated rules tell us what may be wrong. Simulated perspectives help us understand why it matters.

```
┌─────────────────────────────────────────────────────────────┐
│ Web application (system under test)                         │
└────────────────────────────┬────────────────────────────────┘
                             │ Playwright (agency, keyboard, snapshots)
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   John / Deep / Sapna     Asha (axe-core)   Evidence store
   (constrained explore)   (deterministic)   (artifacts)
         └───────────────────┬───────────────────┘
                             ▼
                      Finding engine
                 (normalize, dedupe, cluster)
                             ▼
                 Markdown + JSON reports
```

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Agent contracts | `agents/*.agent.md` | Identity, constraints, severity, evidence rules |
| Skills | `skills/*/SKILL.md` + `src/skills/` | axe scan, keyboard trace, a11y tree, reporting |
| Browser | `src/browser/session.ts` | Chromium lifecycle, auth state, timeouts |
| Journeys | `src/journeys/execute.ts` | Meaningful UI states, not a single page scan |
| Personas | `src/personas/` | Perspective-specific evaluation |
| Findings | `src/findings/engine.ts` | Stable IDs, clustering across agents |
| Evidence | `src/evidence/store.ts` | Run-scoped artifact writes |
| Report | `src/report/write.ts` | Human and machine output |
| CLI | `src/cli.ts` | Enterprise entrypoint and exit codes |

## Execution loop

1. Load config (file → env → CLI).
2. Launch Chromium with optional `storageState`.
3. For each journey step, mutate to a meaningful state.
4. Capture DOM; run enabled personas; persist artifacts.
5. Deduplicate and cluster findings.
6. Emit versioned JSON + Markdown.
7. Exit `1` if any finding meets `failOn`.

Asha runs before John by default so axe evidence is captured before keyboard probes (Escape) mutate dialog state. John re-opens a dialog if an Escape probe closed it.

## Finding contract

Every finding includes `agent`, `journey`, `step`, `category`, `severity`, `confidence`, `finding`, `impact`, `recommendation`, and `evidence`. Reports are invalid if a finding cannot be reproduced from those fields without the agent transcript.

## Versioning

- `schemaVersion` `1.0.0` on findings and reports.
- Additive field changes may occur in `1.x`; breaking changes require `2.0.0`.
