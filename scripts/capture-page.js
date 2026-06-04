import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { ensureDir, loadConfig, parseArgs, runCommand, stopProcessTree, waitForUrl } from "./lib/config.js";

export async function capturePage(options = {}) {
  const config = await loadConfig(options);
  let child;

  await ensureDir(config.artifactsDir);

  try {
    try {
      await waitForUrl(config.url, 1000);
    } catch {
      child = runCommand(config.appCommand);
      await waitForUrl(config.url, config.captureTimeoutMs);
    }

    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: config.viewport,
      deviceScaleFactor: 1
    });

    try {
      await page.goto(config.url, { waitUntil: "networkidle", timeout: config.captureTimeoutMs });
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
            caret-color: transparent !important;
          }
        `
      });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          Array.from(document.images)
            .filter((image) => !image.complete)
            .map((image) => new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            }))
        );
      });
      await page.waitForTimeout(100);
      await page.screenshot({
        path: config.actual,
        fullPage: false,
        animations: "disabled"
      });
    } finally {
      await browser.close();
    }
  } finally {
    await stopProcessTree(child);
  }

  return config.actual;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  capturePage(parseArgs())
    .then((filePath) => {
      console.log(`Captured screenshot: ${filePath}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
