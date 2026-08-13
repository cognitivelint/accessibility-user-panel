# Skill: keyboard-journey

## Purpose
Explore a UI state using Tab/Shift+Tab/Enter/Escape only, recording the focus path for John.

## Checks
- Skip link presence and activation
- Focus sequence and cycles
- Visible focus indicators
- Unreachable mouse-only controls
- Dialog focus entry, trap, and Escape

## Outputs
`evidence/<run>/<journey>/<step>/john-focus-trace.json`

## Implementation
`src/skills/keyboard-journey.ts`

## Safety
Avoid pointer interaction except to restore a dialog that John’s Escape probe closed, so later agents still see the intended state.
