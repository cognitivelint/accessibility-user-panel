# Skill: axe-scan

## Purpose
Run axe-core against the current Playwright page after a meaningful UI state transition. This is Asha’s instrument, not the whole product.

## When to run
- After landing, navigation open, form entry, validation errors, dialog open, tab switch, disclosure expand, or workflow completion.
- Do not scan on every DOM mutation.

## Inputs
- Playwright `Page`
- Tag filter (default WCAG 2 A/AA + best-practice)

## Outputs
- Normalized violations (`ruleId`, impact, nodes, help URL)
- Pass / incomplete counts
- Raw payload stored under `evidence/<run>/<journey>/<step>/asha-axe.json`

## Implementation
`src/skills/axe-scan.ts` wrapping `@axe-core/playwright`.

## Safety
Treat results as deterministic signals. Persona agents interpret user impact separately.
