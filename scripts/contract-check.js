import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { formatScore, loadConfig, parseArgs, readJson, runCommand, stopProcessTree, waitForUrl } from "./lib/config.js";

const DEFAULT_TOLERANCE = {
  x: 8,
  y: 8,
  w: 6,
  h: 6
};

export async function checkContract(options = {}) {
  const config = await loadConfig(options);
  const contract = normalizeContract(await readJson(config.contract));
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
      const page = await browser.newPage({ viewport: contract.viewport ?? config.viewport, deviceScaleFactor: 1 });
      await page.goto(config.url, { waitUntil: "networkidle", timeout: config.captureTimeoutMs });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      const checks = [];
      for (const region of contract.regions) {
        checks.push(await checkRegion(page, region));
      }
      return scoredGate("contract", checks);
    } finally {
      await browser.close();
    }
  } finally {
    await stopProcessTree(child);
  }
}

export function normalizeContract(contract) {
  return {
    ...contract,
    mode: contract.mode ?? "exact_mockup",
    regions: (contract.regions ?? []).map((region) => ({
      ...region,
      tolerance: {
        ...DEFAULT_TOLERANCE,
        ...(region.tolerance ?? {})
      }
    }))
  };
}

export function scoreRegionBounds({ id, expected, actual, tolerance = DEFAULT_TOLERANCE }) {
  const checks = [
    ["x", expected.x, actual.x, tolerance.x],
    ["y", expected.y, actual.y, tolerance.y],
    ["w", expected.w, actual.w, tolerance.w],
    ["h", expected.h, actual.h, tolerance.h]
  ];
  const failures = checks
    .map(([key, target, value, allowed]) => ({
      key,
      delta: Math.round(Math.abs(value - target)),
      allowed
    }))
    .filter((check) => check.delta > check.allowed);
  const passed = failures.length === 0;
  const score = formatScore((100 * (checks.length - failures.length)) / checks.length);
  const issue = passed
    ? undefined
    : `${id} bounds mismatch: ${failures.map((failure) => `${failure.key} delta ${failure.delta}px`).join(", ")}`;

  return {
    label: id,
    passed,
    score,
    issue
  };
}

async function checkRegion(page, region) {
  const locator = resolveLocator(page, region);
  try {
    await locator.waitFor({ state: "visible", timeout: 3000 });
    const box = await locator.boundingBox();
    if (!box) {
      return {
        label: region.id,
        passed: false,
        issue: `${region.id} is visible but has no measurable bounds`
      };
    }

    return scoreRegionBounds({
      id: region.id,
      expected: region.bounds,
      actual: { x: box.x, y: box.y, w: box.width, h: box.height },
      tolerance: region.tolerance
    });
  } catch (error) {
    return {
      label: region.id,
      passed: false,
      issue: `${region.id} not found or not visible: ${error.message}`
    };
  }
}

function resolveLocator(page, region) {
  if (region.selector) {
    return page.locator(region.selector).first();
  }

  const options = {};
  if (region.name) {
    options.name = new RegExp(escapeRegExp(region.name), "i");
  }
  return page.getByRole(region.role, options).first();
}

function scoredGate(name, checks) {
  const failed = checks.filter((check) => !check.passed);
  const score = checks.length === 0
    ? 100
    : formatScore(checks.reduce((total, check) => total + Number(check.score ?? (check.passed ? 100 : 0)), 0) / checks.length);
  return {
    name,
    passed: failed.length === 0,
    score,
    checks,
    issues: failed.map((check) => check.issue)
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkContract(parseArgs())
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
