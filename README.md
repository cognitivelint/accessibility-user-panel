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

```bash
npm install
npx playwright install chromium
npm run demo:serve
# in another shell
npx tsx src/cli.ts run --url http://127.0.0.1:3000
# also valid:
npx tsx src/cli.ts run --config aup.config.yaml
```

Read `reports/<runId>/report.md` first. That briefing is the product. JSON and `evidence/` are for CI and for opening the editor.

## If you see `Cannot find module .../src/evidence/store.js`

Your tree is stale or a local `src/runner/run.ts` still has the old import. From the repo root:

```bash
git fetch origin
git checkout main
git reset --hard origin/main
ls src/evidence/store.ts src/evidence-store.ts
head -5 src/runner/run.ts
npx tsx src/cli.ts --url http://127.0.0.1:3000
```

`head` should mention `evidence-store.js` or the folder `src/evidence/store.ts` must exist. Do not run `node src/cli.ts`.

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
