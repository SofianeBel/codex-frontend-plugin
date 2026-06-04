import fs from "node:fs/promises";
import path from "node:path";
import { projectRoot, writeJson } from "./lib/config.js";

const pluginName = "codex-frontend-plugin";
const marketplaceName = "codex-frontend-visual";
const distRoot = path.join(projectRoot, "dist", "marketplace");
const pluginRoot = path.join(distRoot, "plugins", pluginName);
const marketplacePath = path.join(distRoot, ".agents", "plugins", "marketplace.json");
const copyEntries = [
  ".codex-plugin",
  "skills",
  "hooks",
  "scripts",
  "examples",
  ".visual-references",
  "contracts",
  "visual.config.json",
  "package.json",
  "README.md",
  "AGENTS.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "CHANGELOG.md",
  "SECURITY.md",
  "vite.config.js"
];

await fs.rm(pluginRoot, { recursive: true, force: true });
await fs.mkdir(pluginRoot, { recursive: true });

for (const entry of copyEntries) {
  await fs.cp(path.join(projectRoot, entry), path.join(pluginRoot, entry), {
    recursive: true,
    force: true,
    filter: (source) => !source.includes(`${path.sep}node_modules${path.sep}`) && !source.includes(`${path.sep}artifacts${path.sep}`)
  });
}

await writeJson(marketplacePath, {
  name: marketplaceName,
  interface: {
    displayName: "Codex Frontend Visual"
  },
  plugins: [
    {
      name: pluginName,
      source: {
        source: "local",
        path: `./plugins/${pluginName}`
      },
      policy: {
        installation: "AVAILABLE",
        authentication: "ON_INSTALL"
      },
      category: "Developer Tools"
    }
  ]
});

console.log(`Packaged ${pluginName} marketplace at ${distRoot}`);
console.log(`Marketplace file: ${marketplacePath}`);
