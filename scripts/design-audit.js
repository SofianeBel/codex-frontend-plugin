import { pathToFileURL } from "node:url";
import { formatScore, loadConfig, parseArgs } from "./lib/config.js";
import { joinSource, readSourceFiles } from "./lib/source-files.js";

export async function runDesignAudit(options = {}) {
  const config = await loadConfig(options);
  return auditDesignSource(await readSourceFiles(config.scanRoots));
}

export function auditDesignSource(files) {
  const source = joinSource(files);
  const issues = [];
  const h1Size = firstFontSize(source, /h1\s*\{([^}]+)\}/i);
  const h2Size = firstFontSize(source, /h2\s*\{([^}]+)\}/i);

  if (h1Size && h2Size && h1Size / h2Size < 1.25) {
    issues.push(`Typography hierarchy is too flat: h1 ${h1Size}px vs h2 ${h2Size}px.`);
  }

  if (/border-radius\s*:\s*(3[2-9]|[4-9]\d)px/i.test(source)) {
    issues.push("Card or panel radius exceeds the 32px over-rounding threshold.");
  }

  if (/box-shadow\s*:\s*0\s+(?:1[6-9]|[2-9]\d)px\s+(?:1[6-9]|[2-9]\d)px/i.test(source)) {
    issues.push("Large soft shadows create generic card polish instead of precise hierarchy.");
  }

  if (/font-family\s*:\s*Inter\b/i.test(source)) {
    issues.push("Inter is used as the default font; consider a more intentional type system.");
  }

  return gate("design", issues);
}

function firstFontSize(source, selectorPattern) {
  const block = source.match(selectorPattern)?.[1];
  const value = block?.match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/i)?.[1];
  return value ? Number(value) : null;
}

function gate(name, issues) {
  return {
    name,
    passed: issues.length === 0,
    score: formatScore(Math.max(0, 100 - issues.length * 15)),
    issues
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDesignAudit(parseArgs())
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
