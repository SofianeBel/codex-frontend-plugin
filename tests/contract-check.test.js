import assert from "node:assert/strict";
import test from "node:test";
import { normalizeContract, scoreRegionBounds } from "../scripts/contract-check.js";

test("normalizeContract applies exact mockup mode and per-region tolerance defaults", () => {
  const contract = normalizeContract({
    screen: "home",
    route: "/",
    viewport: { width: 1440, height: 900 },
    reference: ".visual-references/home.png",
    regions: [
      {
        id: "hero-title",
        type: "text",
        role: "heading",
        name: "Build better apps",
        bounds: { x: 120, y: 210, w: 620, h: 160 }
      }
    ]
  });

  assert.equal(contract.mode, "exact_mockup");
  assert.equal(contract.regions[0].tolerance.x, 8);
  assert.equal(contract.regions[0].tolerance.w, 6);
});

test("scoreRegionBounds reports pixel deltas for contract mismatches", () => {
  const result = scoreRegionBounds({
    id: "primary-cta",
    expected: { x: 120, y: 470, w: 160, h: 52 },
    actual: { x: 133, y: 470, w: 148, h: 52 },
    tolerance: { x: 8, y: 8, w: 6, h: 6 }
  });

  assert.equal(result.passed, false);
  assert.equal(result.score, 50);
  assert.match(result.issue, /primary-cta.*x.*13px.*w.*12px/i);
});
