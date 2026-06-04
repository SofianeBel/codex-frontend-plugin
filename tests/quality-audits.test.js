import assert from "node:assert/strict";
import test from "node:test";
import { auditDesignSource } from "../scripts/design-audit.js";
import { auditHallmarkSource } from "../scripts/hallmark-audit.js";
import { auditMotionSource } from "../scripts/motion-audit.js";

test("design audit flags weak hierarchy and over-rounded card styling", () => {
  const result = auditDesignSource([
    {
      path: "src/styles.css",
      content: `
        h1 { font-size: 24px; line-height: 1.1; }
        h2 { font-size: 23px; }
        .card { border-radius: 32px; box-shadow: 0 24px 48px rgba(0,0,0,.18); }
      `
    }
  ]);

  assert.equal(result.name, "design");
  assert.equal(result.passed, false);
  assert.ok(result.score < 100);
  assert.match(result.issues.join("\n"), /hierarchy|radius/i);
});

test("hallmark audit flags generic AI-generated structure fingerprints", () => {
  const result = auditHallmarkSource([
    {
      path: "src/App.jsx",
      content: `
        export function App() {
          return <main>
            <section className="hero"><span>Trusted by 50,000+ teams</span></section>
            <section className="features"><article></article><article></article><article></article></section>
            <section className="cta"></section>
          </main>;
        }
      `
    },
    {
      path: "src/styles.css",
      content: ".headline { background: linear-gradient(90deg,#8b5cf6,#3b82f6); -webkit-background-clip: text; }"
    }
  ]);

  assert.equal(result.name, "hallmark");
  assert.equal(result.passed, false);
  assert.match(result.issues.join("\n"), /gradient text|invented metric|three-card/i);
});

test("motion audit flags generic and inaccessible animation patterns", () => {
  const result = auditMotionSource([
    {
      path: "src/styles.css",
      content: `
        .section { animation: fade-in-up 900ms ease both; }
        .card:hover { transform: scale(1.05); }
        .drawer { transition: width 500ms ease; }
      `
    }
  ]);

  assert.equal(result.name, "motion");
  assert.equal(result.passed, false);
  assert.match(result.issues.join("\n"), /prefers-reduced-motion|hover scale|layout property/i);
});
