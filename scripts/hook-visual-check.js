import fs from "node:fs";
import path from "node:path";
import { visualCheck } from "./visual-check.js";

const pluginRoot = process.env.CODEX_PLUGIN_ROOT ?? process.env.CLAUDE_PLUGIN_ROOT ?? process.cwd();
const configPath = path.join(pluginRoot, "visual.config.json");
const strict = process.env.CODEX_VISUAL_HOOK_STRICT === "1";

if (!fs.existsSync(configPath)) {
  console.log("Visual check skipped: visual.config.json was not found.");
  process.exit(0);
}

try {
  const report = await visualCheck({ config: configPath });
  if (!report.passed) {
    console.log("Visual check failed.");
    if (strict) {
      process.exit(1);
    }
    console.log("Visual check is advisory by default; continuing despite validation failures.");
  }
} catch (error) {
  console.log(`Visual check failed: ${error.message}`);
  if (strict) {
    process.exit(1);
  }
}

process.exit(0);
