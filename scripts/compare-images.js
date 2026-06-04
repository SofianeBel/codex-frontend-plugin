import { pathToFileURL } from "node:url";
import pixelmatch from "pixelmatch";
import sharp from "sharp";
import { ensureDir, formatScore, loadConfig, parseArgs, pathExists, writeJson } from "./lib/config.js";

export async function compareImages(options = {}) {
  const config = await loadConfig(options);
  await ensureDir(config.artifactsDir);

  const reference = await readRgba(config.reference);
  const actualOriginal = await sharp(config.actual).metadata();
  const sizeMismatch =
    actualOriginal.width !== reference.width || actualOriginal.height !== reference.height;
  const actual = await readRgba(config.actual, {
    width: reference.width,
    height: reference.height
  });
  const mask = config.mask && await pathExists(config.mask)
    ? await readMask(config.mask, { width: reference.width, height: reference.height })
    : null;
  const includedPixels = mask ? applyMask(reference.data, actual.data, mask.data, reference.width, reference.height) : reference.width * reference.height;

  const diff = Buffer.alloc(reference.width * reference.height * 4);
  const mismatchedPixels = pixelmatch(reference.data, actual.data, diff, reference.width, reference.height, {
    threshold: config.pixelmatchThreshold
  });
  const totalPixels = includedPixels;
  const mismatchRatio = totalPixels > 0 ? mismatchedPixels / totalPixels : 0;
  const score = formatScore(100 * (1 - mismatchRatio));
  const passed = score >= config.target;
  const issues = buildIssues({
    mismatchedPixels,
    mismatchRatio,
    bounds: findMismatchBounds(reference.data, actual.data, reference.width, reference.height),
    sizeMismatch,
    actualSize: { width: actualOriginal.width, height: actualOriginal.height },
    referenceSize: { width: reference.width, height: reference.height }
  });

  await sharp(diff, {
    raw: {
      width: reference.width,
      height: reference.height,
      channels: 4
    }
  })
    .png()
    .toFile(config.diff);

  const report = {
    score,
    target: config.target,
    passed,
    mismatchedPixels,
    comparedPixels: totalPixels,
    totalPixels,
    mismatchPercent: formatScore(mismatchRatio * 100),
    reference: config.reference,
    actual: config.actual,
    diff: config.diff,
    report: config.report,
    mask: mask ? config.mask : null,
    viewport: config.viewport,
    issues
  };

  await writeJson(config.report, report);
  return report;
}

async function readRgba(filePath, resizeTo) {
  let image = sharp(filePath).ensureAlpha();

  if (resizeTo) {
    image = image.resize(resizeTo.width, resizeTo.height, {
      fit: "fill"
    });
  }

  const metadata = await image.metadata();
  const data = await image.raw().toBuffer();

  return {
    width: metadata.width,
    height: metadata.height,
    data
  };
}

async function readMask(filePath, resizeTo) {
  let image = sharp(filePath).greyscale();

  if (resizeTo) {
    image = image.resize(resizeTo.width, resizeTo.height, {
      fit: "fill"
    });
  }

  return {
    data: await image.raw().toBuffer()
  };
}

function applyMask(reference, actual, mask, width, height) {
  let includedPixels = 0;

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const include = mask[index] > 127;

    if (include) {
      includedPixels += 1;
      continue;
    }

    actual[offset] = reference[offset];
    actual[offset + 1] = reference[offset + 1];
    actual[offset + 2] = reference[offset + 2];
    actual[offset + 3] = reference[offset + 3];
  }

  return includedPixels;
}

function findMismatchBounds(reference, actual, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const delta =
      Math.abs(reference[offset] - actual[offset]) +
      Math.abs(reference[offset + 1] - actual[offset + 1]) +
      Math.abs(reference[offset + 2] - actual[offset + 2]) +
      Math.abs(reference[offset + 3] - actual[offset + 3]);

    if (delta <= 60) {
      continue;
    }

    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (maxX < 0) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

function buildIssues({ mismatchedPixels, mismatchRatio, bounds, sizeMismatch, actualSize, referenceSize }) {
  const issues = [];

  if (sizeMismatch) {
    issues.push(
      `Screenshot size is ${actualSize.width}x${actualSize.height}, reference is ${referenceSize.width}x${referenceSize.height}; actual was normalized before comparison.`
    );
  }

  if (mismatchedPixels > 0) {
    issues.push(`Pixel mismatch covers ${formatScore(mismatchRatio * 100)}% of the reference image.`);
  }

  if (bounds) {
    issues.push(
      `Largest mismatch span is around x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}.`
    );
  }

  return issues;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  compareImages(parseArgs())
    .then((report) => {
      console.log(`Visual score: ${report.score}% (target ${report.target}%)`);
      console.log(`Report: ${report.passed ? "passed" : "failed"}`);
      console.log(`Diff: ${report.diff}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

export const internals = {
  applyMask,
  findMismatchBounds
};
