# Changelog

## 0.3.0 - 2026-06-04

- Added deterministic design quality, anti-AI-slop, motion quality, and design-contract validation layers.
- Added `design-quality`, `anti-ai-slop`, and `motion-quality` plugin skills with self-contained references and third-party attribution.
- Added contract, design, hallmark, motion, motion runtime, and final-score scripts.
- Updated `validate:ui` to produce the full composite quality report.
- Moved generated screenshots, diffs, and reports into structured artifact subdirectories.

## 0.2.2 - 2026-06-04

- Made release ZIP installation the primary marketplace path.
- Clarified that marketplace users do not need to clone the repo or run `npm install`.

## 0.2.1 - 2026-06-04

- Renamed the packaged marketplace source from `codex-frontend-local` to `codex-frontend-visual`.
- Updated marketplace install documentation to use the public release source name.

## 0.2.0 - 2026-06-04

- Added GitHub Actions marketplace release packaging.
- Documented marketplace artifact installation from GitHub Releases.
- Allowed the example mockup generator to use the same CLI config overrides as the validation scripts.

## 0.1.0 - 2026-06-04

- Added the initial Codex plugin scaffold.
- Added the `frontend-mockup` skill.
- Added Playwright capture, pixelmatch comparison, visual report generation, and advisory hook scripts.
- Added a Vite/React demo app and generated mockup fixture.
- Added local marketplace packaging.
- Added strict anti-cheat, asset policy, DOM, interaction, responsive, accessibility, mask-aware comparison, and composite final scoring.
