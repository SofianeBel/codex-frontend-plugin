# Repository Guidelines

## Project Structure & Module Organization

This repository packages the Codex Frontend Visual plugin. Plugin metadata lives in `.codex-plugin/plugin.json`; the Codex skill is in `skills/frontend-mockup/SKILL.md`; advisory hook config is in `hooks/hooks.json`. Runtime scripts are in `scripts/`, with shared helpers under `scripts/lib/`. The demo target used for visual checks is `examples/demo-app/`. Reference mockups belong in `.visual-references/`; generated outputs belong in `artifacts/` and should stay ignored except for `.gitkeep`. Tests live in `tests/*.test.js`.

## Build, Test, and Development Commands

Use Node `>=22`.

- `npm install`: install dependencies.
- `npm run dev`: start the Vite demo app on `127.0.0.1:5173`.
- `npm test`: run Node test runner tests from `tests/`.
- `npm run validate:ui`: run the full visual, contract, design, anti-slop, motion, and hard-gate pipeline.
- `npm run visual:check`: compatibility alias for the same full quality report.
- `npm run contract:check`: validate configured design-contract regions.
- `npm run design:audit`, `npm run hallmark:audit`, `npm run motion:audit`: run focused deterministic quality audits.
- `npm run plugin:validate`: validate plugin structure.
- `npm run marketplace:validate`: validate the repo-scoped marketplace catalog.
- `npm run plugin:package`: build the local marketplace layout in `dist/marketplace`.

## Coding Style & Naming Conventions

Use ESM JavaScript (`import`/`export`) and 2-space indentation. Prefer small scripts with explicit names such as `validate-plugin.js` or `generate-example-mockup.js`. Keep paths configurable through `visual.config.json` and shared helpers in `scripts/lib/config.js`; avoid duplicating command, path, or process-management logic. Keep generated files out of source commits unless they are intentional fixtures, such as `.visual-references/home.png`.

## Testing Guidelines

Tests use the built-in Node test runner. Name tests `*.test.js` and keep them focused on one behavior or gate. Before opening a PR, run `npm test`, `npm run example:mockup`, `npm run validate:ui`, `npm run plugin:validate`, `npm run marketplace:validate`, `npm run plugin:package`, `npm run marketplace:validate -- dist/marketplace`, and `npm run plugin:validate -- dist/marketplace/plugins/codex-frontend-plugin`.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects, for example `Rename marketplace source` and `Clarify marketplace release install`. Keep commits scoped and avoid unrelated formatting churn. PRs should describe the behavior change, list validation commands run, link issues when applicable, and include screenshots or visual-report notes for UI or visual-check changes.

## Security & Configuration Tips

Do not commit `.env`, local logs, `node_modules/`, `dist/`, or generated `artifacts/*`. Keep repo marketplace install instructions first; users should not need to clone the repo for normal plugin installation. Branch protection requires PR review and the `validate` status check on `main`.
