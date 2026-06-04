import assert from "node:assert/strict";
import test from "node:test";
import { buildFinalQualityReport } from "../scripts/final-score.js";

test("buildFinalQualityReport combines quality components with configured weights", () => {
  const report = buildFinalQualityReport({
    config: {
      finalTarget: 90,
      scoreWeights: {
        visual: 30,
        contract: 15,
        design: 15,
        hallmark: 15,
        motion: 10,
        typographyColor: 15
      },
      report: "artifacts/reports/visual-report.json"
    },
    gates: {
      antiCheat: passedGate("antiCheat"),
      assets: passedGate("assets"),
      dom: passedGate("dom"),
      interactions: passedGate("interactions"),
      accessibility: passedGate("accessibility"),
      motionAccessibility: passedGate("motionAccessibility")
    },
    components: {
      visual: component("visual", 100),
      contract: component("contract", 90),
      design: component("design", 80),
      hallmark: component("hallmark", 70),
      motion: component("motion", 60),
      typographyColor: component("typographyColor", 80)
    },
    visual: {
      score: 100,
      target: 97,
      passed: true,
      issues: [],
      reference: "reference.png",
      actual: "actual.png",
      diff: "diff.png",
      viewport: { width: 1440, height: 900 }
    }
  });

  assert.equal(report.finalScore, 84);
  assert.equal(report.passed, false);
  assert.equal(report.components.hallmark.score, 70);
  assert.equal(report.weights.motion, 10);
});

test("buildFinalQualityReport caps interaction failures at 70 and blocks severe hallmark failures", () => {
  const report = buildFinalQualityReport({
    config: {
      finalTarget: 90,
      scoreWeights: {
        visual: 30,
        contract: 15,
        design: 15,
        hallmark: 15,
        motion: 10,
        typographyColor: 15
      }
    },
    gates: {
      antiCheat: passedGate("antiCheat"),
      assets: passedGate("assets"),
      dom: passedGate("dom"),
      interactions: failedGate("interactions"),
      accessibility: passedGate("accessibility"),
      motionAccessibility: passedGate("motionAccessibility")
    },
    components: {
      visual: component("visual", 100),
      contract: component("contract", 100),
      design: component("design", 100),
      hallmark: { ...component("hallmark", 20), severity: "severe" },
      motion: component("motion", 100),
      typographyColor: component("typographyColor", 100)
    },
    visual: {
      score: 100,
      target: 97,
      passed: true,
      issues: [],
      reference: "reference.png",
      actual: "actual.png",
      diff: "diff.png",
      viewport: { width: 1440, height: 900 }
    }
  });

  assert.equal(report.finalScore, 70);
  assert.equal(report.passed, false);
  assert.match(report.issues.join("\n"), /hallmark/i);
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
    issues: [`${name} failed`]
  };
}

function component(name, score) {
  return {
    name,
    passed: score >= 70,
    score,
    issues: []
  };
}
