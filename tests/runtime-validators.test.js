import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { validateAssets, validateHotspots } from "../scripts/validate-ui.js";

test("asset policy fails when an image covers most of the viewport", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });

  try {
    await page.setContent(`
      <html>
        <body style="margin:0">
          <img src="/hero.png" alt="hero" style="display:block;width:100vw;height:100vh" />
        </body>
      </html>
    `);

    const result = await validateAssets(page, {
      forbiddenPatterns: ["mockup", "reference", "screenshot", "data:image"],
      allowedAssets: [],
      maxImageViewportCoverage: 0.35
    });

    assert.equal(result.passed, false);
    assert.match(result.issues.join("\n"), /covers 100% of the viewport/i);
  } finally {
    await browser.close();
  }
});

test("hotspot validation fails invisible clickable controls", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.setContent(`
      <html>
        <body>
          <button style="opacity:0;width:200px;height:60px">Hidden CTA</button>
        </body>
      </html>
    `);

    const result = await validateHotspots(page);

    assert.equal(result.passed, false);
    assert.match(result.issues.join("\n"), /invisible interactive hotspot/i);
  } finally {
    await browser.close();
  }
});
