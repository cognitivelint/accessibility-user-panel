# Accessibility User Panel

AUP is axe-core on steroids for apps that already have Playwright tests. One command drops markdown subagents into your repo. You supply a **URL** and your **existing tests** — those tests are the journeys.

```bash
npm i -D accessibility-user-panel
npx aup init-agents --loop=vscode --url https://staging.example.com
```

Then in VS Code chat, pick **AUP Panel**:

> Review checkout.spec.ts against the URL in aup.config.yaml

`--loop=cursor` and `--loop=claude` write the same agents for those tools. `--loop=copilot` is vscode.

## What you get

```
.github/agents/aup-*.agent.md   # panel + John, Deep, Sapna, Asha
.vscode/mcp.json                # Playwright Test MCP (merged, not replaced)
aup.config.yaml                 # target.url — created only if missing
```

No YAML journey map. The agent follows `*.spec.ts` / `*.test.ts`.

## Personas

| Agent | Asks |
| --- | --- |
| **John** | Can I finish this without a mouse? |
| **Deep** | What does the page announce? |
| **Sapna** | Is the next step obvious? Can I recover? |
| **Asha** | What can we prove — as a lived moment, not a rule ID? |

John, Deep, and Sapna also use **eslint-plugin-jsx-a11y** when the app already has it: source-level proof (`jsx-a11y:alt-text`), confirmed on the live journey. Asha remains the axe-core auditor.

This is not a WCAG certificate and does not replace people who use assistive technologies.

## Optional: run the collector

```bash
npx aup run --url https://staging.example.com
```

Briefing lands in `reports/<runId>/report.md`. Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
