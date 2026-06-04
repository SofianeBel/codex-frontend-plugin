import { pathToFileURL } from "node:url";
import { formatScore, loadConfig, parseArgs } from "./lib/config.js";
import { joinSource, readSourceFiles } from "./lib/source-files.js";

export async function runHallmarkAudit(options = {}) {
  const config = await loadConfig(options);
  return auditHallmarkSource(await readSourceFiles(config.scanRoots));
}

export function auditHallmarkSource(files) {
  const source = joinSource(files);
  const issues = [];

  if (/background(?:-image)?\s*:\s*linear-gradient/i.test(source) && /background-clip\s*:\s*text|-webkit-background-clip\s*:\s*text/i.test(source)) {
    issues.push("Gradient text is a common AI-generated visual fingerprint.");
  }

  if (/(trusted by\s+\d|[+]\s?\d|(?:\d{2,}(?:,\d{3})?)[+]? teams|10x faster|50,000[+]?)/i.test(source)) {
    issues.push("Invented metric or proof claim detected; replace with verified content or a neutral placeholder.");
  }

  if (/(features|feature-grid|grid).{0,160}(<article\b[^>]*>\s*<\/article>\s*){3}/is.test(source)) {
    issues.push("Three-card feature grid detected; vary the structure or prove the cards are the best affordance.");
  }

  if (/(hero|section).{0,120}(features|feature).{0,120}(cta|call-to-action)/is.test(source)) {
    issues.push("Hero to features to CTA rhythm is a saturated generic SaaS structure.");
  }

  if (/browser[-_\s]?chrome|traffic[-_\s]?light|url[-_\s]?bar|phone[-_\s]?frame/i.test(source)) {
    issues.push("Fake browser or device chrome detected.");
  }

  if (/card[^{}]*\{[^}]*\}[\s\S]{0,300}\.card\s+\.card|card-in-card/i.test(source)) {
    issues.push("Nested card structure detected.");
  }

  const severity = issues.length >= 3 ? "severe" : issues.length > 0 ? "warning" : "none";
  return {
    name: "hallmark",
    passed: issues.length === 0,
    score: formatScore(Math.max(0, 100 - issues.length * 20)),
    severity,
    issues
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runHallmarkAudit(parseArgs())
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
