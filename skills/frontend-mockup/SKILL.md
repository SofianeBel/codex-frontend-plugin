---
name: frontend-mockup
description: Implement frontend screens from a mockup image and use the local visual-check loop to compare the result against the reference.
---

# Frontend Mockup

Use this skill when implementing a frontend UI from a mockup image or static design reference.

## Workflow

1. Inspect the mockup before coding. Identify layout grid, spacing, typography, colors, shadows, border radii, icons, image assets, and responsive assumptions.
2. Build the UI in small passes: structure first, then spacing, then typography/colors, then polish details.
3. Keep visual references in `.visual-references/`; never copy them into the frontend app.
4. Run the app locally with the project command from `visual.config.json`.
5. Run `npm run visual:check`.
6. Read `artifacts/visual-report.json` and inspect `artifacts/diff.png`.
7. Fix anti-cheat, asset, DOM, interaction, responsive, and accessibility failures before tuning pixels.
8. Repeat until the final score and visual score meet their configured targets.

## Forbidden Shortcuts

Never:

- embed the full mockup as an image
- use the mockup as a CSS background
- convert the mockup to base64
- draw the mockup on canvas
- place invisible clickable zones over an image
- copy reference screenshots into `public`, `src`, or app assets
- use one full-page SVG/image as the UI

Always:

- use semantic HTML
- use real text
- use real buttons and links
- use CSS layout
- use reusable components
- use only explicitly allowed assets
- keep the UI interactive and accessible

## Implementation Rules

- Match the reference viewport exactly before judging visual fidelity.
- Disable or stabilize animations, timers, randomized content, and loading states during capture.
- Prefer real CSS/layout fixes over moving elements only to satisfy one screenshot.
- Treat anti-cheat failure as a hard failure: final score must be `0`.
- Treat generated reports as objective signals, not perfect diagnosis. Use the diff image to decide what changed.
- Keep the final answer tied to evidence: final score, visual score, gate failures, report path, and whether the check passed.
