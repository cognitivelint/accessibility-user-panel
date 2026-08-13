# Claude + AUP

Use the inbuilt Claude model. Do not add provider SDKs.

AUP is a **token-conscious AI layer** on Playwright + axe-core:

1. Collector (no tokens): keyboard trace, a11y tree, axe, cognitive signals.
2. Packet (≤ ~1800 tokens): `reports/<run>/packet.md`.
3. You (inbuilt Claude): narrate the packet. Do not fetch more context.

If asked to “run AUP”, prefer `scanPlaywrightState` inside an existing test, or `npx tsx src/cli.ts run --url <app>`. Then open **only** `packet.md`.
