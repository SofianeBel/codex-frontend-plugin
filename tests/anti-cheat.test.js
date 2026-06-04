import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runStaticAntiCheat } from "../scripts/validate-ui.js";
import { buildFinalReport } from "../scripts/visual-check.js";

test("static anti-cheat fails when app source references the visual mockup", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-cheat-"));
  await fs.writeFile(path.join(dir, "App.jsx"), "export const img = '../.visual-references/home.png';", "utf8");

  const result = await runStaticAntiCheat({
    scanRoots: [dir],
    forbiddenPatterns: ["mockup", "reference", "screenshot", "data:image"],
    reference: path.join(dir, "..", ".visual-references", "home.png")
  });

  assert.equal(result.passed, false);
  assert.equal(result.score, 0);
  assert.match(result.issues.join("\n"), /visual mockup/i);
});

test("final report forces score to zero when anti-cheat fails", () => {
  const config = {
    finalTarget: 90,
    scoreWeights: {
      dom: 30,
      interactions: 20,
      visual: 30,
      responsive: 10,
      accessibility: 10
    },
    report: "artifacts/visual-report.json"
  };
  const validation = {
    antiCheat: failedGate("antiCheat"),
    assets: passedGate("assets"),
    dom: passedGate("dom"),
    interactions: passedGate("interactions"),
    hotspots: passedGate("hotspots"),
    responsive: passedGate("responsive"),
    accessibility: passedGate("accessibility")
  };
  const visual = {
    score: 100,
    target: 97,
    passed: true,
    issues: [],
    reference: "reference.png",
    actual: "actual.png",
    diff: "diff.png",
    viewport: { width: 1440, height: 900 }
  };

  const report = buildFinalReport(config, validation, visual);

  assert.equal(report.finalScore, 0);
  assert.equal(report.passed, false);
  assert.equal(report.gates.antiCheat.passed, false);
});

function passedGate(name) {
  return {
    name,
    passed: true,
    score: 100,
    issues: []
  };
}

function failedGate(name) {
  return {
    name,
    passed: false,
    score: 0,
    issues: ["cheat detected"]
  };
}
