import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { compareImages } from "../scripts/compare-images.js";

test("compareImages reports a perfect match for identical images", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-visual-"));
  const image = path.join(dir, "image.png");
  const diff = path.join(dir, "diff.png");
  const report = path.join(dir, "report.json");

  await sharp({
    create: {
      width: 24,
      height: 24,
      channels: 4,
      background: "#1f6b4a"
    }
  })
    .png()
    .toFile(image);

  const result = await compareImages({
    reference: image,
    actual: image,
    diff,
    report,
    artifactsDir: dir,
    target: 97
  });

  assert.equal(result.score, 100);
  assert.equal(result.passed, true);
  assert.equal(result.mismatchedPixels, 0);
  await assert.doesNotReject(fs.access(diff));
  await assert.doesNotReject(fs.access(report));
});

test("compareImages fails below target when images differ", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-visual-"));
  const reference = path.join(dir, "reference.png");
  const actual = path.join(dir, "actual.png");

  await sharp({
    create: {
      width: 12,
      height: 12,
      channels: 4,
      background: "#ffffff"
    }
  })
    .png()
    .toFile(reference);

  await sharp({
    create: {
      width: 12,
      height: 12,
      channels: 4,
      background: "#000000"
    }
  })
    .png()
    .toFile(actual);

  const result = await compareImages({
    reference,
    actual,
    diff: path.join(dir, "diff.png"),
    report: path.join(dir, "report.json"),
    artifactsDir: dir,
    target: 97
  });

  assert.equal(result.passed, false);
  assert.ok(result.score < 97);
  assert.ok(result.issues.length > 0);
});

test("compareImages ignores masked pixels", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-visual-"));
  const reference = path.join(dir, "reference.png");
  const actual = path.join(dir, "actual.png");
  const mask = path.join(dir, "mask.png");

  await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 4,
      background: "#ffffff"
    }
  })
    .png()
    .toFile(reference);

  await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 4,
      background: "#000000"
    }
  })
    .png()
    .toFile(actual);

  await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: "#000000"
    }
  })
    .png()
    .toFile(mask);

  const result = await compareImages({
    reference,
    actual,
    mask,
    diff: path.join(dir, "diff.png"),
    report: path.join(dir, "report.json"),
    artifactsDir: dir,
    target: 97
  });

  assert.equal(result.score, 100);
  assert.equal(result.passed, true);
  assert.equal(result.comparedPixels, 0);
});
