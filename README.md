# Codex Frontend Visual Plugin

Prototype Codex plugin and tooling for frontend implementation with visual feedback, anti-cheat validation, design quality checks, anti-AI-slop checks, motion quality checks, and design contracts.

The MVP loop is:

1. Build or edit a frontend UI from a mockup.
2. Run anti-cheat, asset policy, DOM, interaction, responsive, accessibility, design, anti-slop, motion, and contract gates.
3. Launch the local app.
4. Capture a Playwright screenshot.
5. Compare it with the reference image using `pixelmatch`.
6. Write a final composite score, diff image, and JSON report for Codex to use in the next pass.

## Install From Marketplace Release

You do not need to clone this repo or run `npm install` to install the packaged plugin.

1. Download `codex-frontend-plugin-marketplace.zip` from the latest GitHub Release.
2. Extract the ZIP.
3. Add the extracted marketplace directory and install the plugin:

```powershell
Expand-Archive .\codex-frontend-plugin-marketplace.zip .\codex-frontend-plugin-marketplace
codex plugin marketplace add .\codex-frontend-plugin-marketplace
codex plugin add codex-frontend-plugin@codex-frontend-visual
```

Release tags named `v*.*.*` publish the marketplace archive to GitHub Releases.

## Development Commands

```powershell
npm install
npm run dev
npm run example:mockup
npm run validate:ui
npm run visual:check
npm run contract:check
npm run design:audit
npm run hallmark:audit
npm run motion:audit
npm run motion:runtime
npm run plugin:validate
npm run plugin:package
npm test
```

Artifacts are written to `artifacts/`:

- `screenshots/actual.png`
- `diffs/diff.png`
- `reports/visual-report.json`

Reference mockups live in `.visual-references/`, not in `public`, `src`, or app assets. The frontend app must never import or serve those files.

Design contracts live in `contracts/`. The default `contracts/home.contract.json` checks key semantic regions against measured bounds. Use `mode: "exact_mockup"` for faithful reproduction and `mode: "design_dna"` when the reference is inspirational rather than exact.

## Anti-Cheat Rules

`npm run visual:check` is strict. It fails when the UI cheats, even if the screenshot is pixel-perfect.

Blocked shortcuts include:

- full mockup images rendered as the UI
- screenshot backgrounds
- large `data:image` payloads
- canvas redraws of the mockup
- full-page SVG/image UIs
- invisible clickable hotspots
- non-allowlisted images covering too much of the viewport

If anti-cheat fails, `finalScore` is forced to `0`.

## Quality Scoring

Hard gates include anti-cheat, asset policy, real DOM, interactions, accessibility, and reduced-motion safety. Anti-cheat or real-DOM failure sets `finalScore` to `0`; interaction failure caps it at `70`; severe anti-AI-slop or motion accessibility failures prevent pass.

Weighted score components:

- visual fidelity: 30%
- layout / contract precision: 15%
- typography / color precision: 15%
- design quality: 15%
- anti-AI-slop: 15%
- motion quality: 10%

## Plugin Contents

- `.codex-plugin/plugin.json`: plugin metadata
- `skills/frontend-mockup/SKILL.md`: Codex skill for mockup implementation
- `skills/design-quality/SKILL.md`: design polish audit guidance
- `skills/anti-ai-slop/SKILL.md`: generic AI UI fingerprint checks
- `skills/motion-quality/SKILL.md`: purposeful and accessible motion guidance
- `hooks/hooks.json`: advisory hook config
- `scripts/`: capture, compare, and orchestration scripts
- `contracts/`: region-level design contracts
- `examples/demo-app`: small Vite/React target used by the MVP

The hook is advisory by default. Set `CODEX_VISUAL_HOOK_STRICT=1` only when hook behavior is verified in the current Codex surface. See `THIRD_PARTY_NOTICES.md` for upstream design-skill attribution.

## Validation

The CI workflow runs:

```powershell
npm test
npm run example:mockup
npm run validate:ui
npm run plugin:validate
npm run plugin:package
npm run plugin:validate -- dist/marketplace/plugins/codex-frontend-plugin
```

## Local Marketplace Package

For development, run `npm run plugin:package` to create an installable local marketplace layout under `dist/marketplace`.

To install that local development build:

```powershell
codex plugin marketplace add .\dist\marketplace
codex plugin add codex-frontend-plugin@codex-frontend-visual
```

The Marketplace Release workflow can also be run manually from GitHub Actions to validate and download the package without creating a release.
