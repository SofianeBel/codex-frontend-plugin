import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { loadConfig, parseArgs, runCommand, stopProcessTree, waitForUrl } from "./lib/config.js";

export async function checkMotionRuntime(options = {}) {
  const config = await loadConfig(options);
  let child;

  try {
    try {
      await waitForUrl(config.url, 1000);
    } catch {
      child = runCommand(config.appCommand);
      await waitForUrl(config.url, config.captureTimeoutMs);
    }

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: config.viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
      await page.goto(config.url, { waitUntil: "networkidle", timeout: config.captureTimeoutMs });
      const issues = await page.evaluate(() => {
        const result = [];
        const animated = Array.from(document.querySelectorAll("*")).filter((element) => {
          const style = getComputedStyle(element);
          return style.animationName !== "none" || Number.parseFloat(style.transitionDuration) > 0;
        });
        if (animated.length > 0) {
          result.push(`${animated.length} elements still animate or transition under prefers-reduced-motion.`);
        }
        return result;
      });

      return {
        name: "motionAccessibility",
        passed: issues.length === 0,
        score: issues.length === 0 ? 100 : 0,
        issues
      };
    } finally {
      await browser.close();
    }
  } finally {
    await stopProcessTree(child);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkMotionRuntime(parseArgs())
    .then((report) => {
      console.log(`${report.name}: ${report.passed ? "passed" : "failed"} (${report.score}%)`);
      for (const issue of report.issues) {
        console.log(`- ${issue}`);
      }
      if (!report.passed) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
