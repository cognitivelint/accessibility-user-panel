import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { BrowserError } from "../errors.js";
import type { Logger } from "../logging.js";
import type { RunConfig } from "../schema/report.js";

export class BrowserSession {
  private constructor(
    readonly browser: Browser,
    readonly context: BrowserContext,
    readonly page: Page,
    readonly log: Logger,
  ) {}

  static async launch(config: RunConfig, log: Logger): Promise<BrowserSession> {
    try {
      const browser = await chromium.launch({ headless: config.headless });
      const context = await browser.newContext({
        viewport: config.target.viewport ?? { width: 1280, height: 720 },
        storageState: config.target.storageState,
        extraHTTPHeaders: config.target.extraHttpHeaders,
        reducedMotion: "reduce",
      });
      context.setDefaultNavigationTimeout(config.navigationTimeoutMs);
      const page = await context.newPage();
      return new BrowserSession(browser, context, page, log.child({ component: "browser" }));
    } catch (error) {
      throw new BrowserError("Failed to launch Chromium for accessibility exploration", error);
    }
  }

  async goto(url: string): Promise<void> {
    this.log.info("Navigating", { url });
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
    await this.page.waitForLoadState("networkidle").catch(() => undefined);
  }

  async close(): Promise<void> {
    await this.context.close();
    await this.browser.close();
  }
}
