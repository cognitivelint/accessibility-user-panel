# Architecture

## Principle

AUP is a **token-conscious AI layer** on Playwright + axe-core, with eslint-plugin-jsx-a11y as source-level proof for John, Deep, and Sapna. The journey is the test you already wrote. The scanners are axe you already run and jsx-a11y you already lint. The panel compresses extra persona evidence into a packet for Cursor’s or Claude’s inbuilt model.

```
Playwright test (journey you already have)
        │
        ▼  after the same action where you call axe
Local collector (John/Deep/Sapna + jsx-a11y, Asha + axe)  ← zero model tokens
        │
        ▼  ≤ ~1800 tokens, no DOM, no axe/eslint JSON
packet.md / packet.json
        │
        ▼  model: inherit
Cursor inbuilt LLM  or  Claude inbuilt LLM
```

## Layers

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

| Layer | Location | Responsibility |
| --- | --- | --- |
| Agent contracts | `agents/*.agent.md` | Identity, constraints, severity, evidence rules |
| Skills | `skills/*/SKILL.md` + `src/skills/` | axe scan, jsx-a11y collect, keyboard trace, a11y tree, reporting |
| Browser | `src/browser/session.ts` | Chromium lifecycle, auth state, timeouts |
| Journeys | `src/journeys/execute.ts` | Meaningful UI states, not a single page scan |
| Personas | `src/personas/` | Perspective-specific evaluation |
| Voice | `src/voice/` | Lived moments, habits, axe-to-story translation |
| Findings | `src/findings/engine.ts` | Stable IDs, clustering across agents |
| Evidence | `src/evidence-store.ts` | Run-scoped artifact writes |
| Report | `src/report/write.ts` | Briefing first, JSON second |
| Token packet | `src/ai/packet.ts` | Caps model context (~1800 tokens); drops DOM/axe dumps |
| Playwright state scan | `src/ai/scan-state.ts` | Same hook as `AxeBuilder.analyze()` |
| Cursor / Claude | `.cursor/`, `.claude/`, `AGENTS.md`, `CLAUDE.md` | Inbuilt models only |

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

Every finding includes `agent`, `journey`, `step`, `category`, `severity`, `confidence`, `finding`, `livedMoment`, `habit`, `impact`, `recommendation`, and `evidence`. Reports are invalid if a developer needs a rule ID to understand what happened.

## Versioning

- `schemaVersion` `1.1.0` on findings and reports (`livedMoment`, `habit`).
- Additive field changes may occur in `1.x`; breaking changes require `2.0.0`.
