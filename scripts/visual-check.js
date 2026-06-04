import { pathToFileURL } from "node:url";
import { capturePage } from "./capture-page.js";
import { compareImages } from "./compare-images.js";
import { formatScore, loadConfig, parseArgs, writeJson } from "./lib/config.js";
import { validateUi } from "./validate-ui.js";

export async function visualCheck(options = {}) {
  const config = await loadConfig(options);
  const validation = await validateUi(options);
  const antiCheatPassed = validation.antiCheat.passed;

  await capturePage(options);
  const visual = await compareImages(options);
  const report = buildFinalReport(config, validation, visual);
  await writeJson(config.report, report);
  printReport(report);

  if (!report.passed) {
    process.exitCode = 1;
  }

  return report;
}

export function buildFinalReport(config, validation, visual) {
  const components = {
    dom: validation.dom.score,
    interactions: validation.interactions.score,
    visual: visual.score,
    responsive: validation.responsive.score,
    accessibility: validation.accessibility.score
  };
  const hardGates = {
    antiCheat: validation.antiCheat.passed,
    assets: validation.assets.passed,
    dom: validation.dom.passed,
    interactions: validation.interactions.passed,
    hotspots: validation.hotspots.passed,
    responsive: validation.responsive.passed,
    accessibility: validation.accessibility.passed,
    visual: visual.passed
  };
  const finalScore = antiCheatPassed(config, validation)
    ? weightedScore(components, config.scoreWeights)
    : 0;
  const issues = collectIssues(validation, visual);
  const passed = finalScore >= config.finalTarget && Object.values(hardGates).every(Boolean);

  return {
    finalScore,
    finalTarget: config.finalTarget,
    visualScore: visual.score,
    visualTarget: visual.target,
    passed,
    components,
    weights: config.scoreWeights,
    gates: {
      antiCheat: validation.antiCheat,
      assets: validation.assets,
      dom: validation.dom,
      interactions: validation.interactions,
      hotspots: validation.hotspots,
      responsive: validation.responsive,
      accessibility: validation.accessibility,
      visual: {
        name: "visual",
        passed: visual.passed,
        score: visual.score,
        issues: visual.issues
      }
    },
    reference: visual.reference,
    actual: visual.actual,
    diff: visual.diff,
    report: config.report,
    mask: visual.mask,
    viewport: visual.viewport,
    issues
  };
}

function antiCheatPassed(_config, validation) {
  return validation.antiCheat.passed;
}

function weightedScore(components, weights) {
  const totalWeight = Object.values(weights).reduce((total, value) => total + value, 0);
  if (totalWeight <= 0) {
    return 0;
  }

  return formatScore(
    Object.entries(weights).reduce((total, [key, weight]) => total + (components[key] ?? 0) * weight, 0) / totalWeight
  );
}

function collectIssues(validation, visual) {
  const issues = [];
  for (const gateReport of Object.values(validation)) {
    for (const issue of gateReport.issues ?? []) {
      issues.push(`[${gateReport.name}] ${issue}`);
    }
  }
  for (const issue of visual.issues ?? []) {
    issues.push(`[visual] ${issue}`);
  }
  return issues;
}

export function printReport(report) {
  console.log(`Final score: ${report.finalScore}% (target ${report.finalTarget}%)`);
  console.log(`Visual score: ${report.visualScore}% (target ${report.visualTarget}%)`);
  console.log(`Status: ${report.passed ? "passed" : "failed"}`);
  console.log(`Actual: ${report.actual}`);
  console.log(`Diff: ${report.diff}`);
  console.log(`Report: ${report.report ?? "see visual-report.json"}`);

  for (const issue of report.issues ?? []) {
    console.log(`- ${issue}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  visualCheck(parseArgs()).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
