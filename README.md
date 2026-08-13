# Accessibility User Panel

Playwright supplies agency. axe-core supplies objective evidence. Persona agents supply perspective. The report supplies traceability.

This is an **experience layer** for automated web accessibility testing — not a WCAG certification, not a replacement for people who use assistive technologies, and not a claim that any persona represents a population.

## Personas

| Agent | Perspective | Primary question |
| --- | --- | --- |
| **John** | Keyboard-only | Can I complete this journey without a mouse? |
| **Deep** | Screen-reader semantics | Does the UI expose enough correct information to understand and operate it? |
| **Sapna** | Cognitive / sensory | Can I understand what is happening, what to do next, and how to recover? |
| **Asha** | Deterministic auditor | What does axe-core report at this UI state? |

Agent contracts live in [`agents/`](agents/) (Playwright-style Markdown). Runtime implementations live in [`src/personas/`](src/personas/).

## Requirements

- Node.js 20.11+
- Chromium via Playwright (`npx playwright install chromium`)

## Quick start

```bash
npm install
npx playwright install chromium
npm run demo:serve
# in another shell
npx tsx src/cli.ts run --config aup.config.yaml
```

Reports are written to `reports/<runId>/report.md` and `report.json`. Artifacts (axe JSON, ARIA snapshots, focus traces, screenshots, DOM) land under `evidence/<runId>/`.

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
import { createLogger } from "./logging.js"; // or inject your own logger
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Finding schema version is `1.0.0`.

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
