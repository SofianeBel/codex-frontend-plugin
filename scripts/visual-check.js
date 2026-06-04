import { pathToFileURL } from "node:url";
import { capturePage } from "./capture-page.js";
import { compareImages } from "./compare-images.js";
import { checkContract } from "./contract-check.js";
import { runDesignAudit, runTypographyColorAudit } from "./design-audit.js";
import { buildFinalQualityReport, writeFinalQualityReport } from "./final-score.js";
import { runHallmarkAudit } from "./hallmark-audit.js";
import { loadConfig, parseArgs, writeJson } from "./lib/config.js";
import { runMotionAudit } from "./motion-audit.js";
import { checkMotionRuntime } from "./motion-runtime-check.js";
import { validateUi } from "./validate-ui.js";

export async function visualCheck(options = {}) {
  const config = await loadConfig(options);
  const validation = await validateUi(options);
  const contract = await checkContract(options);
  const design = await runDesignAudit(options);
  const typographyColor = await runTypographyColorAudit(options);
  const hallmark = await runHallmarkAudit(options);
  const motion = await runMotionAudit(options);
  const motionAccessibility = await checkMotionRuntime(options);

  await capturePage(options);
  const visual = await compareImages(options);
  const report = await writeFinalQualityReport({
    config,
    gates: {
      antiCheat: validation.antiCheat,
      assets: validation.assets,
      dom: validation.dom,
      interactions: validation.interactions,
      hotspots: validation.hotspots,
      responsive: validation.responsive,
      accessibility: validation.accessibility,
      motionAccessibility
    },
    components: {
      visual,
      contract,
      design,
      typographyColor,
      hallmark,
      motion
    },
    visual
  });
  printReport(report);

  if (!report.passed) {
    process.exitCode = 1;
  }

  return report;
}

export function buildFinalReport(config, validation, visual) {
  return buildFinalQualityReport({
    config,
    gates: {
      antiCheat: validation.antiCheat,
      assets: validation.assets,
      dom: validation.dom,
      interactions: validation.interactions,
      hotspots: validation.hotspots,
      responsive: validation.responsive,
      accessibility: validation.accessibility,
      motionAccessibility: {
        name: "motionAccessibility",
        passed: true,
        score: 100,
        issues: []
      }
    },
    components: {
      visual,
      contract: { name: "contract", passed: true, score: 100, issues: [] },
      typographyColor: { name: "typographyColor", passed: true, score: 100, issues: [] },
      design: { name: "design", passed: true, score: 100, issues: [] },
      hallmark: { name: "hallmark", passed: true, score: 100, issues: [] },
      motion: { name: "motion", passed: true, score: 100, issues: [] }
    },
    visual
  });
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
