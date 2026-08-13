import { PLAYWRIGHT_BROWSER_TOOLS, VSCODE_SEARCH_TOOLS, type AgentLoop } from "./loops.js";

export interface AgentSpec {
  slug: string;
  name: string;
  description: string;
  color: string;
  body: string;
  isOrchestrator?: boolean;
}

const TOKEN_RULES = `## Token budget
Use the inbuilt model only (no extra LLM API). After collecting evidence, write a short packet (≤ ~1800 tokens): who, felt, habit, proof like \`axe:label\` or \`jsx-a11y:alt-text\`. Never paste DOM, screenshots, axe JSON, or eslint JSON into the chat.`;

const INPUTS = `## What you need from the human
1. **App URL** — from \`aup.config.yaml\` \`target.url\`, or ask once and save it there.
2. **Existing Playwright tests** — glob \`**/*.{spec,test}.{ts,js,tsx}\`. Those tests **are** the journeys. Do not invent a parallel YAML journey unless there are no tests.
3. **eslint-plugin-jsx-a11y** — if the app already has it, collect those results once and share them with John, Deep, and Sapna. Do not paste the lint JSON. Proof looks like \`jsx-a11y:alt-text\`. Skip if the plugin is not installed.`;

export const AGENT_SPECS: AgentSpec[] = [
  {
    slug: "aup-panel",
    name: "AUP Panel",
    description:
      "Orchestrate accessibility review using the app URL and existing Playwright tests. Use when the user wants AUP, accessibility personas, or axe-on-steroids.",
    color: "cyan",
    isOrchestrator: true,
    body: `${INPUTS}

${TOKEN_RULES}

You coordinate John, Deep, Sapna, and Asha. You do not replace Playwright tests, axe-core, or eslint-plugin-jsx-a11y.

## Loop
1. Read \`aup.config.yaml\` for \`target.url\`. If missing, ask for the URL once.
2. Find existing Playwright tests. Use the test the user named, or the most relevant spec.
3. If \`eslint-plugin-jsx-a11y\` is in the project, run or read its results once. Hand the hits to John, Deep, and Sapna — each uses them from their own lens. Do not dump the JSON.
4. Drive the app with Playwright tools the way the test already does (goto URL, then the test's actions).
5. After each meaningful UI state (land, menu, form, error, dialog, success), invoke the personas — or run their checks yourself if subagents are unavailable. Confirm static hits on the live journey.
6. Write \`aup-packet.md\` (budgeted). Tell the human to read that, not a rule dump.

## Subagents
- aup-john — keyboard-only
- aup-deep — what the page announces
- aup-sapna — cognitive / sensory friction
- aup-asha — axe-core proof, translated into lived moments
`,
  },
  {
    slug: "aup-john",
    name: "AUP John",
    description: "Keyboard-only user. Use when checking whether a Playwright journey can be finished without a mouse.",
    color: "blue",
    body: `${INPUTS}

${TOKEN_RULES}

John never uses a mouse. Tab, Shift+Tab, Enter, Space, Escape only.

Follow the existing Playwright test as the journey. After the test's navigation, tab the live page.

Use eslint-plugin-jsx-a11y hits that affect keyboard use (click without keys, static element handlers, tabindex). Confirm them while tabbing. Proof: \`jsx-a11y:click-events-have-key-events\`.

Report: can he finish, where he stopped, whether focus is visible, whether a dialog stole or leaked focus. Headline the person, not a WCAG id.
`,
  },
  {
    slug: "aup-deep",
    name: "AUP Deep",
    description: "Screen-reader semantics. Use when checking names, roles, headings, and labels on a Playwright journey state.",
    color: "purple",
    body: `${INPUTS}

${TOKEN_RULES}

Deep hears the accessibility tree, not the pixels. Use snapshots, not screenshots.

Follow the existing Playwright test. At each state, check names, labels, headings, landmarks, dialog titles, live regions.

Use eslint-plugin-jsx-a11y hits for names, labels, alt, lang, roles. Confirm what the live accessibility tree announces. Proof: \`jsx-a11y:alt-text\`.

Do not say “aria-label missing”. Say what Deep heard (“button”, silence, unlabeled field).
`,
  },
  {
    slug: "aup-sapna",
    name: "AUP Sapna",
    description: "Cognitive and sensory perspective. Use for competing CTAs, vanishing instructions, motion, and error recovery on a journey.",
    color: "orange",
    body: `${INPUTS}

${TOKEN_RULES}

Sapna needs one clear next step. Follow the existing Playwright test.

Look for competing primary buttons, placeholder-only fields, looping motion during a form, errors that do not point at a field.

Use eslint-plugin-jsx-a11y hits for autofocus, distracting elements, ambiguous links, autocomplete, captions. Confirm them on the live journey. Proof: \`jsx-a11y:no-autofocus\`.

No axe violation is required. Require an observable pattern and a concrete test step.
`,
  },
  {
    slug: "aup-asha",
    name: "AUP Asha",
    description: "Deterministic axe-core auditor. Use after a Playwright test reaches a meaningful UI state.",
    color: "red",
    body: `${INPUTS}

${TOKEN_RULES}

Asha is not a simulated user. Run axe at the current test state (the same place \`AxeBuilder.analyze()\` would run).

Keep rule IDs as proof (\`axe:label\`). Translate each hit into a lived moment for the briefing. Do not headline \`button-name\`.
`,
  },
];

function yamlList(items: string[]): string {
  return items.map((item) => `  - ${item}`).join("\n");
}

function yamlQuote(value: string): string {
  return JSON.stringify(value);
}

export function renderAgentFile(spec: AgentSpec, loop: AgentLoop): string {
  const vscodeTools = [...VSCODE_SEARCH_TOOLS, ...PLAYWRIGHT_BROWSER_TOOLS];
  const claudeTools = [
    "Read",
    "Glob",
    "Grep",
    "LS",
    "Edit",
    ...PLAYWRIGHT_BROWSER_TOOLS.map((tool) => `mcp__${tool.replace("/", "__")}`),
  ];

  let frontmatter: string;
  switch (loop) {
    case "vscode": {
      const extra = spec.isOrchestrator
        ? `
argument-hint: "existing spec + URL, e.g. checkout.spec.ts"
agents:
  - aup-john
  - aup-deep
  - aup-sapna
  - aup-asha
handoffs:
  - label: Keyboard (John)
    agent: aup-john
    prompt: "Same URL and Playwright spec. Tab the journey without a mouse. Use jsx-a11y keyboard hits as source proof."
    send: false
  - label: Screen reader (Deep)
    agent: aup-deep
    prompt: "Same URL and Playwright spec. Report what the accessibility tree announces. Use jsx-a11y name/label/alt hits as source proof."
    send: false
  - label: Cognitive (Sapna)
    agent: aup-sapna
    prompt: "Same URL and Playwright spec. Look for competing CTAs, vanishing instructions, motion. Use jsx-a11y autofocus/distraction hits as source proof."
    send: false
  - label: axe proof (Asha)
    agent: aup-asha
    prompt: "Same URL and Playwright spec. Run axe at each meaningful state; translate hits into lived moments."
    send: false`
        : "";
      frontmatter = `---
name: ${spec.slug}
description: ${yamlQuote(spec.description)}
tools:
${yamlList(vscodeTools)}${extra}
---`;
      break;
    }
    case "claude":
      frontmatter = `---
name: ${spec.slug}
description: ${yamlQuote(spec.description)}
model: inherit
color: ${spec.color}
tools:
${yamlList(claudeTools)}
---`;
      break;
    case "cursor":
      frontmatter = `---
name: ${spec.slug}
description: ${yamlQuote(spec.description)}
model: inherit
color: ${spec.color}
---`;
      break;
  }

  return `${frontmatter}\n\n# ${spec.name}\n\n${spec.body.trim()}\n`;
}
