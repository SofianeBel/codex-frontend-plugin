import { pathToFileURL } from "node:url";
import { formatScore, loadConfig, parseArgs } from "./lib/config.js";
import { joinSource, readSourceFiles } from "./lib/source-files.js";

export async function runMotionAudit(options = {}) {
  const config = await loadConfig(options);
  return auditMotionSource(await readSourceFiles(config.scanRoots));
}

export function auditMotionSource(files) {
  const source = joinSource(files);
  const issues = [];
  const hasAnimation = /animation\s*:|transition\s*:|@keyframes|motion\.|framer-motion/i.test(source);

  if (hasAnimation && !/prefers-reduced-motion/i.test(source)) {
    issues.push("Animations are present without a prefers-reduced-motion fallback.");
  }

  if (/hover[^{]*\{[^}]*transform\s*:\s*scale\(/i.test(source) || /whileHover\s*=\s*\{\{[^}]*scale/i.test(source)) {
    issues.push("Hover scale is overused in AI-generated UIs; prefer purposeful state feedback.");
  }

  if (/transition\s*:[^;]*(width|height|top|left|right|bottom|margin|padding)/i.test(source)) {
    issues.push("Transition animates a layout property; prefer transform or opacity.");
  }

  if (/fade[-_]?in[-_]?up/i.test(source)) {
    issues.push("Generic fade-in-up reveal detected; tailor motion to the element or remove it.");
  }

  if (/infinite[^;]*(pulse|bounce)|animation\s*:[^;]*(pulse|bounce)[^;]*infinite/i.test(source)) {
    issues.push("Infinite pulse or bounce animation needs a clear purpose.");
  }

  return {
    name: "motion",
    passed: issues.length === 0,
    score: formatScore(Math.max(0, 100 - issues.length * 20)),
    issues
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMotionAudit(parseArgs())
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
