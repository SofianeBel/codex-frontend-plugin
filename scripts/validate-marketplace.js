import path from "node:path";
import { pathToFileURL } from "node:url";
import { projectRoot, readJson } from "./lib/config.js";
import { validatePlugin } from "./validate-plugin.js";

const marketplaceRoot = path.resolve(process.argv[2] ?? projectRoot);

export async function validateMarketplace(root = marketplaceRoot) {
  const marketplacePath = path.join(root, ".agents", "plugins", "marketplace.json");
  const marketplace = await readJson(marketplacePath);
  const errors = [];

  requireString(marketplace.name, "marketplace name", errors);
  requireString(marketplace.interface?.displayName, "marketplace interface.displayName", errors);

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    errors.push("marketplace must include at least one plugin entry");
  }

  for (const entry of marketplace.plugins ?? []) {
    await validateEntry(root, entry, errors);
  }

  if (errors.length > 0) {
    throw new Error(errors.map((error) => `- ${error}`).join("\n"));
  }

  return marketplace.name;
}

async function validateEntry(root, entry, errors) {
  requireString(entry.name, "plugin entry name", errors);
  requireString(entry.category, `${entry.name} category`, errors);

  if (entry.source?.source !== "local") {
    errors.push(`${entry.name} source.source must be local`);
  }

  const sourcePath = entry.source?.path;
  if (typeof sourcePath !== "string" || !sourcePath.startsWith("./")) {
    errors.push(`${entry.name} source.path must start with ./`);
    return;
  }

  const pluginRoot = path.resolve(root, sourcePath);
  const relative = path.relative(root, pluginRoot);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    errors.push(`${entry.name} source.path must stay inside the marketplace root`);
    return;
  }

  try {
    const pluginName = await validatePlugin(pluginRoot);
    if (pluginName !== entry.name) {
      errors.push(`${entry.name} does not match plugin manifest name ${pluginName}`);
    }
  } catch (error) {
    errors.push(`${entry.name} plugin validation failed: ${error.message}`);
  }

  if (!["AVAILABLE", "INSTALLED_BY_DEFAULT", "NOT_AVAILABLE"].includes(entry.policy?.installation)) {
    errors.push(`${entry.name} policy.installation is invalid`);
  }

  if (!["ON_INSTALL", "ON_USE"].includes(entry.policy?.authentication)) {
    errors.push(`${entry.name} policy.authentication is invalid`);
  }
}

function requireString(value, label, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`missing ${label}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateMarketplace(marketplaceRoot)
    .then((name) => {
      console.log(`Marketplace validation passed: ${name} at ${marketplaceRoot}`);
    })
    .catch((error) => {
      console.error(`Marketplace validation failed:\n${error.message}`);
      process.exitCode = 1;
    });
}
