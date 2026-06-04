# Codex Frontend Visual Plugin

Prototype Codex plugin and tooling for frontend implementation with visual feedback and anti-cheat validation.

The MVP loop is:

1. Build or edit a frontend UI from a mockup.
2. Run anti-cheat, asset policy, DOM, interaction, responsive, and accessibility gates.
3. Launch the local app.
4. Capture a Playwright screenshot.
5. Compare it with the reference image using `pixelmatch`.
6. Write a final composite score, diff image, and JSON report for Codex to use in the next pass.

## Commands

```powershell
npm install
npm run dev
npm run example:mockup
npm run validate:ui
npm run visual:check
npm run plugin:validate
npm run plugin:package
npm test
```

Artifacts are written to `artifacts/`:

- `actual.png`
- `diff.png`
- `visual-report.json`

Reference mockups live in `.visual-references/`, not in `public`, `src`, or app assets. The frontend app must never import or serve those files.

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

## Plugin Contents

- `.codex-plugin/plugin.json`: plugin metadata
- `skills/frontend-mockup/SKILL.md`: Codex skill for mockup implementation
- `hooks/hooks.json`: advisory hook config
- `scripts/`: capture, compare, and orchestration scripts
- `examples/demo-app`: small Vite/React target used by the MVP

The hook is advisory by default. Set `CODEX_VISUAL_HOOK_STRICT=1` only when hook behavior is verified in the current Codex surface.

## Validation

The CI workflow runs:

```powershell
npm test
npm run validate:ui
npm run example:mockup
npm run visual:check
npm run plugin:validate
npm run plugin:package
npm run plugin:validate -- dist/marketplace/plugins/codex-frontend-plugin
```

## Marketplace Package

Run `npm run plugin:package` to create an installable local marketplace layout under `dist/marketplace`.

To install it later:

```powershell
codex plugin marketplace add .\dist\marketplace
codex plugin add codex-frontend-plugin@codex-frontend-local
```

The GitHub release pipeline builds the same marketplace layout and archives it as `codex-frontend-plugin-marketplace.zip`. After downloading a release artifact, extract it and add the extracted marketplace directory:

```powershell
Expand-Archive .\codex-frontend-plugin-marketplace.zip .\codex-frontend-plugin-marketplace
codex plugin marketplace add .\codex-frontend-plugin-marketplace
codex plugin add codex-frontend-plugin@codex-frontend-local
```

Release tags named `v*.*.*` publish the marketplace archive to GitHub Releases. The same workflow can also be run manually from GitHub Actions to validate and download the package without creating a release.
