import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultPluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function resolveHookContext(env = process.env, cwd = process.cwd()) {
  return {
    workspaceRoot: path.resolve(env.CODEX_WORKSPACE_ROOT ?? env.CLAUDE_PROJECT_DIR ?? cwd),
    pluginRoot: path.resolve(env.CODEX_PLUGIN_ROOT ?? env.CLAUDE_PLUGIN_ROOT ?? defaultPluginRoot),
    strict: env.CODEX_VISUAL_HOOK_STRICT === "1"
  };
}

export function resolveVisualCheckPath({ workspaceRoot, pluginRoot }) {
  const workspaceScript = path.join(workspaceRoot, "scripts", "visual-check.js");
  if (fs.existsSync(workspaceScript)) {
    return workspaceScript;
  }

  const pluginScript = path.join(pluginRoot, "scripts", "visual-check.js");
  const pluginPlaywright = path.join(pluginRoot, "node_modules", "playwright");
  if (fs.existsSync(pluginScript) && fs.existsSync(pluginPlaywright)) {
    return pluginScript;
  }

  return null;
}

export async function runHook({
  env = process.env,
  cwd = process.cwd(),
  log = console.log,
  importModule = (modulePath) => import(modulePath)
} = {}) {
  const context = resolveHookContext(env, cwd);
  const configPath = path.join(context.workspaceRoot, "visual.config.json");

  if (!fs.existsSync(configPath)) {
    log("Visual check skipped: visual.config.json was not found in the current workspace.");
    return 0;
  }

  const visualCheckPath = resolveVisualCheckPath(context);
  if (!visualCheckPath) {
    log("Visual check skipped: scripts/visual-check.js was not found in the workspace and plugin dependencies are not installed.");
    return 0;
  }

  try {
    const { visualCheck } = await importModule(pathToFileURL(visualCheckPath).href);
    const report = await visualCheck({ config: configPath });
    if (!report.passed) {
      log("Visual check failed.");
      if (context.strict) {
        return 1;
      }
      log("Visual check is advisory by default; continuing despite validation failures.");
    }
  } catch (error) {
    log(`Visual check failed: ${error.message}`);
    if (context.strict) {
      return 1;
    }
  }

  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runHook();
}
