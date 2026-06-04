import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import {
  formatScore,
  loadConfig,
  parseArgs,
  pathExists,
  projectRoot,
  resolvePath,
  runCommand,
  stopProcessTree,
  waitForUrl
} from "./lib/config.js";

const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".jsx", ".mjs", ".ts", ".tsx", ".svg"]);
const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpg", ".jpeg", ".png", ".svg", ".webp"]);

export async function validateUi(options = {}) {
  const config = await loadConfig(options);
  const antiCheat = await runStaticAntiCheat(config);
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
      const page = await browser.newPage({ viewport: config.viewport, deviceScaleFactor: 1 });
      await preparePage(page, config);

      const assets = await validateAssets(page, config);
      const dom = await validateDom(page, config);
      const interactions = await validateInteractions(page, config);
      const hotspots = await validateHotspots(page);
      const accessibility = buildAccessibilityGate(dom, hotspots);
      const responsive = await validateResponsive(browser, config);

      return {
        antiCheat,
        assets,
        dom,
        interactions,
        hotspots,
        accessibility,
        responsive
      };
    } finally {
      await browser.close();
    }
  } finally {
    await stopProcessTree(child);
  }
}

export async function runStaticAntiCheat(config) {
  const issues = [];
  const roots = await existingScanRoots(config.scanRoots);
  const forbidden = config.forbiddenPatterns.map((pattern) => pattern.toLowerCase());
  const referenceName = path.basename(config.reference).toLowerCase();

  for (const root of roots) {
    for await (const filePath of walkFiles(root)) {
      const extension = path.extname(filePath).toLowerCase();
      const relative = path.relative(projectRoot, filePath);
      const lowerRelative = relative.toLowerCase();

      if (IMAGE_EXTENSIONS.has(extension) && forbidden.some((pattern) => lowerRelative.includes(pattern))) {
        issues.push(`Forbidden reference-like asset in app source: ${relative}`);
      }

      if (!TEXT_EXTENSIONS.has(extension)) {
        continue;
      }

      const source = await fs.readFile(filePath, "utf8");
      const lowerSource = source.toLowerCase();

      if (lowerSource.includes(".visual-references") || lowerSource.includes(referenceName)) {
        issues.push(`App source references the visual mockup directly: ${relative}`);
      }

      if (/data:image\/[^;]+;base64,[a-z0-9+/=]{2048,}/i.test(source)) {
        issues.push(`Large base64 image detected in app source: ${relative}`);
      }

      if (/<canvas\b|createelement\(["']canvas["']\)|getcontext\(["']2d["']\)/i.test(source)) {
        issues.push(`Canvas rendering detected in app source: ${relative}`);
      }

      if (/background(?:-image)?\s*:[^;]*(mockup|reference|screenshot|data:image)/i.test(source)) {
        issues.push(`Suspicious screenshot background detected in app source: ${relative}`);
      }

      if (extension === ".svg" && /<svg\b[^>]*(width=["']?100%|height=["']?100%|viewbox=["'][^"']*1440[^"']*900)/i.test(source)) {
        issues.push(`Possible full-page SVG mockup detected: ${relative}`);
      }
    }
  }

  return gate("antiCheat", issues);
}

export async function validateAssets(page, config) {
  const forbidden = config.forbiddenPatterns.map((pattern) => pattern.toLowerCase());
  const allowedAssets = config.allowedAssets.map((asset) => asset.toLowerCase());
  const maxCoverage = config.maxImageViewportCoverage;
  const issues = await page.evaluate(({ forbidden, allowedAssets, maxCoverage }) => {
    const viewportArea = window.innerWidth * window.innerHeight;
    const elements = [];

    for (const image of document.images) {
      const rect = image.getBoundingClientRect();
      elements.push({
        kind: "image",
        source: image.currentSrc || image.src || image.getAttribute("src") || "",
        coverage: viewportArea > 0 ? (rect.width * rect.height) / viewportArea : 0
      });
    }

    for (const element of document.querySelectorAll("*")) {
      const style = getComputedStyle(element);
      if (!style.backgroundImage || style.backgroundImage === "none" || !style.backgroundImage.includes("url(")) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      elements.push({
        kind: "background-image",
        source: style.backgroundImage,
        coverage: viewportArea > 0 ? (rect.width * rect.height) / viewportArea : 0
      });
    }

    const result = [];
    for (const item of elements) {
      const source = item.source.toLowerCase();
      const basename = source.split(/[\\/]/).pop() || source;
      const isAllowed = allowedAssets.some((asset) => source.includes(asset) || basename.includes(asset));

      if (forbidden.some((pattern) => source.includes(pattern))) {
        result.push(`${item.kind} uses a forbidden source pattern: ${item.source}`);
      }

      if (item.coverage > maxCoverage && !isAllowed) {
        result.push(
          `${item.kind} covers ${Math.round(item.coverage * 100)}% of the viewport without being allowlisted: ${item.source || "(inline)"}`
        );
      }
    }

    return result;
  }, { forbidden, allowedAssets, maxCoverage });

  return gate("assets", issues);
}

async function validateDom(page, config) {
  const checks = [];

  for (const check of config.domChecks) {
    const result = await findRole(page, check);
    checks.push(result);
  }

  return scoredGate("dom", checks);
}

async function validateInteractions(page, config) {
  const checks = [];

  for (const check of config.interactionChecks) {
    await preparePage(page, config);
    const result = await runInteraction(page, check);
    checks.push(result);
  }

  return scoredGate("interactions", checks);
}

export async function validateHotspots(page) {
  const issues = await page.evaluate(() => {
    const selectors = "a, button, [role='button'], [onclick]";
    const result = [];

    for (const element of document.querySelectorAll(selectors)) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const text = (element.innerText || element.textContent || "").trim();
      const aria = element.getAttribute("aria-label") || element.getAttribute("title") || "";
      const visibleBox = rect.width > 0 && rect.height > 0;
      const transparent = Number(style.opacity || "1") < 0.05 || style.visibility === "hidden" || style.display === "none";
      const interactiveName = text || aria;
      const elementName = element.tagName.toLowerCase();

      if (!visibleBox) {
        continue;
      }

      if (transparent) {
        result.push(`${elementName} is an invisible interactive hotspot`);
      }

      if (!interactiveName) {
        result.push(`${elementName} has no visible text or accessible name`);
      }

      if ((style.position === "absolute" || style.position === "fixed") && !text && !aria) {
        result.push(`${elementName} is positioned over the page without visible intent`);
      }
    }

    return result;
  });

  return gate("hotspots", issues);
}

function buildAccessibilityGate(dom, hotspots) {
  const issues = [];
  if (!dom.passed) {
    issues.push("Required semantic DOM checks did not all pass.");
  }
  if (!hotspots.passed) {
    issues.push(...hotspots.issues);
  }
  return gate("accessibility", issues);
}

async function validateResponsive(browser, config) {
  if (config.responsiveViewports.length === 0) {
    return {
      name: "responsive",
      passed: true,
      score: 100,
      checks: [],
      issues: []
    };
  }

  const checks = [];
  for (const viewport of config.responsiveViewports) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    try {
      await preparePage(page, config);
      const result = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      const passed = result.scrollWidth <= result.clientWidth + 1;
      checks.push({
        label: `${viewport.width}x${viewport.height}`,
        passed,
        issue: passed
          ? undefined
          : `Horizontal overflow at ${viewport.width}x${viewport.height}: scrollWidth ${result.scrollWidth}, clientWidth ${result.clientWidth}`
      });
    } finally {
      await page.close();
    }
  }

  return scoredGate("responsive", checks);
}

async function preparePage(page, config) {
  await page.goto(config.url, { waitUntil: "networkidle", timeout: config.captureTimeoutMs });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function findRole(page, check) {
  try {
    const options = {};
    if (check.name) {
      options.name = new RegExp(escapeRegExp(check.name), "i");
    }
    if (check.level) {
      options.level = Number(check.level);
    }
    const locator = page.getByRole(check.role, options).first();
    await locator.waitFor({ state: "visible", timeout: 3000 });
    return {
      label: `${check.role}: ${check.name ?? "(any)"}`,
      passed: true
    };
  } catch {
    return {
      label: `${check.role}: ${check.name ?? "(any)"}`,
      passed: false,
      issue: `Missing visible ${check.role}${check.name ? ` named "${check.name}"` : ""}`
    };
  }
}

async function runInteraction(page, check) {
  const label = `${check.action}: ${check.role ?? check.selector ?? ""} ${check.name ?? ""}`.trim();

  try {
    const target = check.selector ? page.locator(check.selector).first() : page.getByRole(check.role, {
      name: check.name ? new RegExp(escapeRegExp(check.name), "i") : undefined
    }).first();
    await target.waitFor({ state: "visible", timeout: 3000 });

    if (check.action === "click") {
      await target.click();
    } else if (check.action === "fill") {
      await target.fill(check.value ?? "test");
    } else {
      throw new Error(`Unsupported interaction action: ${check.action}`);
    }

    await assertExpectation(page, check.expect);
    return { label, passed: true };
  } catch (error) {
    return {
      label,
      passed: false,
      issue: `${label} failed: ${error.message}`
    };
  }
}

async function assertExpectation(page, expect) {
  if (!expect) {
    return;
  }

  if (expect.urlContains && !page.url().includes(expect.urlContains)) {
    throw new Error(`URL does not include ${expect.urlContains}`);
  }

  if (expect.text) {
    await page.getByText(new RegExp(escapeRegExp(expect.text), "i")).first().waitFor({ state: "visible", timeout: 3000 });
  }

  if (expect.role) {
    const options = {};
    if (expect.name) {
      options.name = new RegExp(escapeRegExp(expect.name), "i");
    }
    await page.getByRole(expect.role, options).first().waitFor({ state: "visible", timeout: 3000 });
  }
}

async function existingScanRoots(scanRoots) {
  const roots = [];
  for (const scanRoot of scanRoots) {
    const target = resolvePath(scanRoot);
    if (await pathExists(target)) {
      roots.push(target);
    }
  }
  return roots;
}

async function* walkFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(target);
    } else if (entry.isFile()) {
      yield target;
    }
  }
}

function gate(name, issues) {
  return {
    name,
    passed: issues.length === 0,
    score: issues.length === 0 ? 100 : 0,
    issues
  };
}

function scoredGate(name, checks) {
  const failed = checks.filter((check) => !check.passed);
  const score = checks.length === 0 ? 100 : formatScore((100 * (checks.length - failed.length)) / checks.length);

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
  validateUi(parseArgs())
    .then((report) => {
      for (const gateReport of Object.values(report)) {
        console.log(`${gateReport.name}: ${gateReport.passed ? "passed" : "failed"} (${gateReport.score}%)`);
        for (const issue of gateReport.issues ?? []) {
          console.log(`- ${issue}`);
        }
      }
      if (Object.values(report).some((gateReport) => !gateReport.passed)) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
