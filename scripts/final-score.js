import { pathToFileURL } from "node:url";
import { formatScore, parseArgs, readJson, writeJson } from "./lib/config.js";

const DEFAULT_WEIGHTS = {
  visual: 30,
  contract: 15,
  typographyColor: 15,
  design: 15,
  hallmark: 15,
  motion: 10
};

export function buildFinalQualityReport({ config, gates, components, visual }) {
  const weights = normalizeQualityWeights(config.scoreWeights);
  const normalizedComponents = normalizeComponents(components);
  const gateReports = normalizeGates(gates, visual);
  const rawScore = weightedScore(normalizedComponents, weights);
  const cappedScore = applyCaps(rawScore, gateReports, normalizedComponents);
  const hardGatePassed = requiredHardGatesPassed(gateReports);
  const blockingQuality = hasBlockingQualityFailure(normalizedComponents, gateReports);
  const passed = cappedScore >= Number(config.finalTarget ?? 90) && hardGatePassed && !blockingQuality;
  const issues = collectIssues(gateReports, normalizedComponents, blockingQuality);

  return {
    finalScore: cappedScore,
    finalTarget: Number(config.finalTarget ?? 90),
    visualScore: visual.score,
    visualTarget: visual.target,
    passed,
    components: normalizedComponents,
    weights,
    gates: gateReports,
    reference: visual.reference,
    actual: visual.actual,
    diff: visual.diff,
    report: config.report,
    mask: visual.mask,
    viewport: visual.viewport,
    issues
  };
}

export async function writeFinalQualityReport(options) {
  const report = buildFinalQualityReport(options);
  if (options.config.report) {
    await writeJson(options.config.report, report);
  }
  return report;
}

export function normalizeQualityWeights(weights = {}) {
  return {
    ...DEFAULT_WEIGHTS,
    ...Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, Number(value)]))
  };
}

function normalizeComponents(components = {}) {
  const result = {};
  for (const key of Object.keys(DEFAULT_WEIGHTS)) {
    const component = components[key] ?? { name: key, passed: true, score: 100, issues: [] };
    result[key] = {
      name: component.name ?? key,
      passed: component.passed ?? Number(component.score ?? 100) >= 70,
      score: Number(component.score ?? 100),
      severity: component.severity,
      issues: component.issues ?? [],
      checks: component.checks ?? []
    };
  }
  return result;
}

function normalizeGates(gates = {}, visual) {
  return {
    ...gates,
    visual: {
      name: "visual",
      passed: visual.passed,
      score: visual.score,
      issues: visual.issues ?? []
    }
  };
}

function weightedScore(components, weights) {
  const totalWeight = Object.values(weights).reduce((total, value) => total + value, 0);
  if (totalWeight <= 0) {
    return 0;
  }

  return formatScore(
    Object.entries(weights).reduce((total, [key, weight]) => total + (components[key]?.score ?? 0) * weight, 0) / totalWeight
  );
}

function applyCaps(score, gates, components) {
  if (!gates.antiCheat?.passed || !gates.dom?.passed) {
    return 0;
  }

  let capped = score;
  if (!gates.interactions?.passed) {
    capped = Math.min(capped, 70);
  }
  if (components.hallmark?.severity === "severe") {
    capped = Math.min(capped, 70);
  }

  return formatScore(capped);
}

function requiredHardGatesPassed(gates) {
  const required = ["antiCheat", "assets", "dom", "accessibility", "motionAccessibility"];
  return required.every((name) => gates[name]?.passed !== false);
}

function hasBlockingQualityFailure(components, gates) {
  return components.hallmark?.severity === "severe" || gates.motionAccessibility?.passed === false;
}

function collectIssues(gates, components, blockingQuality) {
  const issues = [];
  for (const report of Object.values(gates)) {
    for (const issue of report?.issues ?? []) {
      issues.push(`[${report.name}] ${issue}`);
    }
  }
  for (const report of Object.values(components)) {
    for (const issue of report?.issues ?? []) {
      issues.push(`[${report.name}] ${issue}`);
    }
  }
  if (blockingQuality && components.hallmark?.severity === "severe") {
    issues.push("[hallmark] Severe anti-AI-slop failure prevents pass.");
  }
  return issues;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const reportPath = args.input ?? args.report ?? "artifacts/reports/visual-report.json";
  readJson(reportPath)
    .then((report) => {
      console.log(`Final score: ${report.finalScore}% (target ${report.finalTarget}%)`);
      console.log(`Status: ${report.passed ? "passed" : "failed"}`);
      if (!report.passed) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
