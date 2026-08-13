# Token-conscious AI layer

AUP is **axe-core on steroids**, not a second test runner.

Playwright tests already map the journey. Playwright + axe already collect rules. AUP’s AI layer only interprets a **budgeted packet** with Cursor’s or Claude’s inbuilt model (`model: inherit`). There is no OpenAI/Anthropic SDK.

## Rules (non-negotiable)

1. Never paste `report.json`, `dom.html`, screenshots, or `asha-axe.json` into the model.
2. The only model input is `reports/<run>/packet.md` (or `packet.json`). Typical budget: **≤ 1800 tokens**.
3. If the packet is missing, run the deterministic collector (`scanPlaywrightState` or `aup run`). Do not browse the app “for context.”
4. Do not re-run axe in the model. Asha already did. Proof looks like `axe:label`, not a node dump.
5. Prefer one habit per moment. Do not expand into WCAG essays.
6. Existing Playwright test title = journey. The last action in that test = step.

## Drop-in (same place as axe)

```ts
import { scanPlaywrightState } from "accessibility-user-panel";

test("checkout pay dialog", async ({ page }) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Pay" }).click();
  const { packet } = await scanPlaywrightState({
    page,
    test: "checkout pay dialog",
    step: "dialog open",
  });
  // Attach packet.md to the Cursor/Claude turn — not the DOM.
});
```
