import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { projectRoot, readJson } from "./lib/config.js";

const pluginPath = path.resolve(process.argv[2] ?? projectRoot);

async function validatePlugin(root) {
  const manifestPath = path.join(root, ".codex-plugin", "plugin.json");
  const manifest = await readJson(manifestPath);
  const errors = [];

  requireString(manifest.name, "plugin name", errors);
  requireString(manifest.version, "plugin version", errors);
  requireString(manifest.description, "plugin description", errors);
  requireString(manifest.skills, "skills path", errors);

  if ("hooks" in manifest) {
    errors.push("plugin.json must not declare hooks; keep hook config in hooks/hooks.json");
  }

  if (manifest.name !== "codex-frontend-plugin") {
    errors.push(`plugin name must be codex-frontend-plugin, got ${manifest.name}`);
  }

  await requirePath(path.join(root, manifest.skills ?? "skills"), "skills directory", errors);
  await requirePath(path.join(root, "skills", "frontend-mockup", "SKILL.md"), "frontend-mockup skill", errors);
  await requirePath(path.join(root, "hooks", "hooks.json"), "advisory hook config", errors);
  await requirePath(path.join(root, "scripts", "visual-check.js"), "visual check script", errors);
  await requirePath(path.join(root, ".visual-references", "home.png"), "visual reference mockup", errors);

  const hooks = await readJson(path.join(root, "hooks", "hooks.json"));
  if (!hooks.hooks?.Stop?.[0]?.hooks?.[0]?.command) {
    errors.push("hooks/hooks.json must define a Stop command hook");
  }

  if (errors.length > 0) {
    throw new Error(errors.map((error) => `- ${error}`).join("\n"));
  }

  return manifest.name;
}

function requireString(value, label, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`missing ${label}`);
  }
}

async function requirePath(targetPath, label, errors) {
  try {
    await fs.access(targetPath);
  } catch {
    errors.push(`missing ${label}: ${targetPath}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  validatePlugin(pluginPath)
    .then((name) => {
      console.log(`Plugin validation passed: ${name} at ${pluginPath}`);
    })
    .catch((error) => {
      console.error(`Plugin validation failed:\n${error.message}`);
      process.exitCode = 1;
    });
}

export { validatePlugin };
