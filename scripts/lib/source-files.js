import fs from "node:fs/promises";
import path from "node:path";
import { projectRoot, resolvePath } from "./config.js";

const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".jsx", ".mjs", ".ts", ".tsx", ".vue", ".svelte"]);

export async function readSourceFiles(scanRoots = []) {
  const files = [];

  for (const scanRoot of scanRoots) {
    const root = resolvePath(scanRoot);
    if (!(await pathExists(root))) {
      continue;
    }

    const stat = await fs.stat(root);
    if (stat.isFile()) {
      await maybeReadFile(root, files);
    } else if (stat.isDirectory()) {
      for await (const filePath of walkFiles(root)) {
        await maybeReadFile(filePath, files);
      }
    }
  }

  return files;
}

export function joinSource(files) {
  return files.map((file) => `/* ${file.path} */\n${file.content}`).join("\n");
}

async function maybeReadFile(filePath, files) {
  if (!TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
    return;
  }

  files.push({
    path: path.relative(projectRoot, filePath),
    content: await fs.readFile(filePath, "utf8")
  });
}

async function* walkFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(target);
    } else if (entry.isFile()) {
      yield target;
    }
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
