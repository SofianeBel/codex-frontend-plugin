import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const nextValue = argv[index + 1];
    const value = inlineValue ?? (nextValue && !nextValue.startsWith("--") ? nextValue : "true");
    if (inlineValue === undefined && value === nextValue) {
      index += 1;
    }

    args[rawKey] = value;
  }

  return args;
}

export function resolvePath(value, root = projectRoot) {
  if (!value) {
    return value;
  }

  return path.isAbsolute(value) ? value : path.join(root, value);
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await fs.rename(`${filePath}.tmp`, filePath);
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function loadConfig(overrides = {}) {
  const configPath = resolvePath(overrides.config ?? "visual.config.json");
  const config = await readJson(configPath);
  const merged = {
    ...config,
    ...overrides
  };

  merged.target = Number(merged.target ?? config.target ?? 97);
  merged.finalTarget = Number(merged.finalTarget ?? config.finalTarget ?? merged.target);
  merged.captureTimeoutMs = Number(merged.captureTimeoutMs ?? 30000);
  merged.pixelmatchThreshold = Number(merged.pixelmatchThreshold ?? 0.1);
  merged.maxImageViewportCoverage = Number(merged.maxImageViewportCoverage ?? 0.35);
  merged.viewport = normalizeViewport(merged.viewport);
  merged.responsiveViewports = (merged.responsiveViewports ?? []).map(normalizeViewport);
  merged.scoreWeights = normalizeWeights(merged.scoreWeights);
  merged.scanRoots = merged.scanRoots ?? [];
  merged.allowedAssets = merged.allowedAssets ?? [];
  merged.forbiddenPatterns = merged.forbiddenPatterns ?? ["mockup", "reference", "screenshot", "data:image"];
  merged.domChecks = merged.domChecks ?? [];
  merged.interactionChecks = merged.interactionChecks ?? [];
  merged.artifactsDir = resolvePath(merged.artifactsDir ?? "artifacts");
  merged.reference = resolvePath(merged.reference);
  merged.mask = merged.mask ? resolvePath(merged.mask) : null;
  merged.actual = resolvePath(merged.actual ?? path.join(merged.artifactsDir, "actual.png"));
  merged.diff = resolvePath(merged.diff ?? path.join(merged.artifactsDir, "diff.png"));
  merged.report = resolvePath(merged.report ?? path.join(merged.artifactsDir, "visual-report.json"));

  return merged;
}

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function normalizeViewport(value) {
  if (typeof value === "string") {
    const [width, height] = value.toLowerCase().split("x").map(Number);
    return { width, height };
  }

  return {
    width: Number(value?.width ?? 1440),
    height: Number(value?.height ?? 900)
  };
}

export function formatScore(score) {
  return Number(score.toFixed(2));
}

export function normalizeWeights(weights = {}) {
  return {
    dom: Number(weights.dom ?? 30),
    interactions: Number(weights.interactions ?? 20),
    visual: Number(weights.visual ?? 30),
    responsive: Number(weights.responsive ?? 10),
    accessibility: Number(weights.accessibility ?? 10)
  };
}

export function runCommand(command, cwd = projectRoot) {
  const child = spawn(command, {
    cwd,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  return child;
}

export async function stopProcessTree(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true
      });
      killer.on("close", resolve);
      killer.on("error", resolve);
    });
    return;
  }

  child.kill("SIGTERM");
}

export async function waitForUrl(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const status = await requestStatus(url);
      if (status >= 200 && status < 500) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "no response"}`);
}

function requestStatus(url) {
  const client = url.startsWith("https:") ? https : http;

  return new Promise((resolve, reject) => {
    const request = client.get(url, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });
    request.setTimeout(2000, () => {
      request.destroy(new Error("request timed out"));
    });
    request.on("error", reject);
  });
}
