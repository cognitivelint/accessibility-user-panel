# Skill: accessibility-tree

## Purpose
Capture what is programmatically exposed to assistive technology for Deep.

## Sources
- `page.accessibility.snapshot`
- Playwright ARIA snapshots (`locator.ariaSnapshot()`)
- Heading order and label association in the DOM

## Outputs
`evidence/<run>/<journey>/<step>/deep-aria-snapshot.md`

## Implementation
`src/skills/accessibility-tree.ts`

## Safety
This is not a full screen-reader emulator. It records names, roles, structure, and unlabeled controls only.
