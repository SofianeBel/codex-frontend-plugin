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
  await requirePath(path.join(root, "skills", "design-quality", "SKILL.md"), "design-quality skill", errors);
  await requirePath(path.join(root, "skills", "anti-ai-slop", "SKILL.md"), "anti-ai-slop skill", errors);
  await requirePath(path.join(root, "skills", "motion-quality", "SKILL.md"), "motion-quality skill", errors);
  await validateSkillFrontmatter(path.join(root, manifest.skills ?? "skills"), errors);
  await requirePath(path.join(root, "hooks", "hooks.json"), "advisory hook config", errors);
  await requirePath(path.join(root, "scripts", "visual-check.js"), "visual check script", errors);
  await requirePath(path.join(root, "scripts", "final-score.js"), "final score script", errors);
  await requirePath(path.join(root, "contracts", "home.contract.json"), "home design contract", errors);
  await requirePath(path.join(root, ".visual-references", "home.png"), "visual reference mockup", errors);
  await requirePath(path.join(root, "THIRD_PARTY_NOTICES.md"), "third-party notices", errors);

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

async function validateSkillFrontmatter(skillsRoot, errors) {
  let entries;
  try {
    entries = await fs.readdir(skillsRoot, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillPath = path.join(skillsRoot, entry.name, "SKILL.md");
    try {
      validateSkillFrontmatterText(await fs.readFile(skillPath, "utf8"), skillPath);
    } catch (error) {
      errors.push(error.message);
    }
  }
}

function validateSkillFrontmatterText(content, skillPath = "SKILL.md") {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error(`invalid skill frontmatter in ${skillPath}: missing YAML block`);
  }

  const frontmatter = match[1].split(/\r?\n/);
  for (const line of frontmatter) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf(":");
    if (separator <= 0) {
      throw new Error(`invalid skill frontmatter in ${skillPath}: expected key: value`);
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!["name", "description", "license", "allowed-tools", "metadata"].includes(key)) {
      throw new Error(`invalid skill frontmatter in ${skillPath}: unsupported key ${key}`);
    }
    if (value === "") {
      throw new Error(`invalid skill frontmatter in ${skillPath}: missing value for ${key}`);
    }

    const quoted = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (!quoted && /:\s/.test(value)) {
      throw new Error(`invalid skill frontmatter in ${skillPath}: quote ${key} when it contains a colon`);
    }
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

export { validatePlugin, validateSkillFrontmatterText };
