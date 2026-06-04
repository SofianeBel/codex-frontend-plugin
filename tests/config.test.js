import assert from "node:assert/strict";
import test from "node:test";
import { formatScore, normalizeViewport, parseArgs } from "../scripts/lib/config.js";

test("parseArgs supports inline and separated values", () => {
  assert.deepEqual(parseArgs(["--target=97", "--actual", "artifacts/actual.png"]), {
    target: "97",
    actual: "artifacts/actual.png"
  });
});

test("normalizeViewport parses width by height strings", () => {
  assert.deepEqual(normalizeViewport("1440x900"), {
    width: 1440,
    height: 900
  });
});

test("formatScore rounds to two decimals", () => {
  assert.equal(formatScore(92.456), 92.46);
});

