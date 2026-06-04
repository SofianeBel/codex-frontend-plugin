import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { resolveHookContext, resolveVisualCheckPath, runHook } from "../scripts/hook-visual-check.js";

test("hook resolves visual config from the workspace, not the plugin cache", () => {
  const context = resolveHookContext(
    {
      CLAUDE_PLUGIN_ROOT: "C:/plugin-cache",
      CLAUDE_PROJECT_DIR: "C:/workspace"
    },
    "C:/fallback"
  );

  assert.equal(path.basename(context.workspaceRoot), "workspace");
  assert.equal(path.basename(context.pluginRoot), "plugin-cache");
});

test("hook skips before importing visual checker when workspace has no visual config", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "visual-hook-workspace-"));
  const logs = [];

  const exitCode = await runHook({
    cwd: workspace,
    env: {},
    log: (message) => logs.push(message),
    importModule: async () => {
      throw new Error("visual-check should not be imported");
    }
  });

  assert.equal(exitCode, 0);
  assert.match(logs.join("\n"), /visual\.config\.json was not found/);
});

test("hook skips when only plugin cache script exists without plugin node_modules", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "visual-hook-workspace-"));
  const pluginRoot = await fs.mkdtemp(path.join(os.tmpdir(), "visual-hook-plugin-"));
  await fs.writeFile(path.join(workspace, "visual.config.json"), "{}\n");
  await fs.mkdir(path.join(pluginRoot, "scripts"), { recursive: true });
  await fs.writeFile(path.join(pluginRoot, "scripts", "visual-check.js"), "export async function visualCheck() {}\n");

  assert.equal(resolveVisualCheckPath({ workspaceRoot: workspace, pluginRoot }), null);
});

test("hook imports the workspace visual checker when available", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "visual-hook-workspace-"));
  const scriptPath = path.join(workspace, "scripts", "visual-check.js");
  await fs.mkdir(path.dirname(scriptPath), { recursive: true });
  await fs.writeFile(path.join(workspace, "visual.config.json"), "{}\n");
  await fs.writeFile(scriptPath, "export async function visualCheck() { return { passed: true }; }\n");

  const imports = [];
  const exitCode = await runHook({
    cwd: workspace,
    env: {},
    log: () => {},
    importModule: async (modulePath) => {
      imports.push(modulePath);
      return { visualCheck: async () => ({ passed: true }) };
    }
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(imports, [pathToFileURL(scriptPath).href]);
});
