import { loadRunConfig } from "../src/config/load.js";
import { createLogger } from "../src/logging.js";
import { renderCliBriefing } from "../src/report/write.js";
import { runAccessibilityPanel } from "../src/runner/run.js";
import { startDemoServer } from "../fixtures/demo-app/server.js";

async function main(): Promise<void> {
  const demo = await startDemoServer(Number(process.env.PORT ?? 0) || 0);
  process.stdout.write(`Demo app ${demo.url}\n`);

  try {
    const config = loadRunConfig({
      url: demo.url,
      configPath: "aup.config.yaml",
    });
    config.target.url = demo.url;
    const result = await runAccessibilityPanel(config, createLogger("warn", { app: "aup-demo" }));
    process.stdout.write(`\n${renderCliBriefing(result.report)}\n\nBriefing: ${result.markdownPath}\n`);
    if (result.exitCode !== 0) {
      process.stdout.write("The demo is supposed to find problems. A real `aup run` would exit 1 here so CI notices.\n");
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    if (/executable doesn't exist|browserType\.launch/i.test(message)) {
      process.stderr.write("Install the browser once: npx playwright install chromium\n");
    }
    process.exitCode = 2;
  } finally {
    await demo.close();
  }
}

await main();
