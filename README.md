# Accessibility User Panel

The product is not a linter with better formatting. It is a way for developers to **meet the people inside their UI** until those people show up while they type.

A checker might say `button-name` or “aria-label missing”. This panel says: *Deep reached a control and heard only “button”. He had to guess.* Then it offers a habit to keep: *If you ship a control, read it out loud.*

Playwright supplies agency. axe-core supplies proof. Persona agents supply perspective. The briefing supplies consciousness.

This is not a WCAG certification, not a replacement for people who use assistive technologies, and not a claim that any persona represents a population.

## Personas

| Agent | Perspective | Primary question |
| --- | --- | --- |
| **John** | Keyboard-only | Can I complete this journey without a mouse? |
| **Deep** | Screen-reader semantics | Does the UI expose enough correct information to understand and operate it? |
| **Sapna** | Cognitive / sensory | Can I understand what is happening, what to do next, and how to recover? |
| **Asha** | Deterministic auditor | What can we *prove* — then tell as a lived moment, not a rule ID? |

Agent contracts live in [`agents/`](agents/). Runtimes live in [`src/personas/`](src/personas/). Voice lives in [`src/voice/`](src/voice/).

## Requirements

- Node.js 20.11+
- Chromium via Playwright (`npx playwright install chromium`)

## Quick start

Do not run `node src/cli.ts`. TypeScript imports `*.js` modules; those files only exist after `npm run build`, or when running through `tsx`.

```bash
npm install
npx playwright install chromium
npm run demo
```

That starts the broken checkout fixture and writes a briefing under `reports/<runId>/report.md`.

To scan your own app after install:

```bash
npm run aup -- run --url http://127.0.0.1:3000
# or
npx tsx src/cli.ts run --config aup.config.yaml
```

If you already compiled (`npm run build`), `node dist/cli.js run --url ...` also works.

Read `reports/<runId>/report.md` first. That briefing is the product. JSON and `evidence/` are for CI and for opening the editor.

## Configuration

See [`aup.config.yaml`](aup.config.yaml). CLI flags override file and environment (`AUP_URL`, `AUP_HEADLESS`, `AUP_FAIL_ON`).

```yaml
target:
  url: https://app.example.com
  storageState: .auth/state.json   # optional Playwright storage state
agents: [asha, deep, sapna, john]
failOn: high
journeys:
  - id: checkout
    name: Checkout
    steps:
      - { id: landing, name: Landing, kind: explore }
      - { id: dialog, name: Pay dialog, kind: open-dialog, selector: "[data-opens=dialog]" }
```

Exit codes: `0` below `--fail-on`, `1` when a finding meets the threshold, `2` on configuration or runtime failure.

## Programmatic API

```ts
import { loadRunConfig, runAccessibilityPanel } from "accessibility-user-panel";
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Finding schema version is `1.1.0` (`livedMoment` + `habit` on every finding).

## Tests

```bash
npm test          # unit
npm run test:e2e  # live Chromium against the fixture app
npm run typecheck
npm run lint
```

The fixture at `fixtures/demo-app` is a deliberately broken checkout used as a golden path for the four agents.

## Non-goals (MVP)

Full WCAG certification, native mobile AT, perfect screen-reader emulation, universal neurodivergence modeling, automatic source remediation.
