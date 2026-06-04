# Contributing

Thanks for helping improve Codex Frontend Visual Plugin.

## Development Setup

```powershell
npm ci
npm run example:mockup
npm run validate:ui
npm run visual:check
npm test
```

Install Playwright's Chromium browser if your machine does not already have it:

```powershell
npx playwright install chromium
```

## Expected Checks

Before opening a pull request, run:

```powershell
npm test
npm run validate:ui
npm run visual:check
npm run plugin:validate
npm run plugin:package
npm run plugin:validate -- dist/marketplace/plugins/codex-frontend-plugin
```

## Contribution Scope

- Keep the MVP focused on local screenshot capture, image comparison, and Codex-readable feedback.
- Keep mockups in `.visual-references/`; do not move references into app-served directories.
- Add tests when changing anti-cheat, asset, DOM, interaction, mask, or scoring behavior.
- Do not make the advisory hook block completion until Codex hook behavior is verified across supported environments.
- Prefer small, reproducible fixtures over large binary assets.
- Update `README.md` and `CHANGELOG.md` when user-facing commands or behavior change.
