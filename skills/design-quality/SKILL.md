---
name: design-quality
description: Audit and improve frontend design quality beyond screenshot similarity: typography, spacing, color, layout, responsive behavior, UX copy, and component polish.
---

# Design Quality

Use this skill after visual fidelity and real-DOM checks pass, or when a UI matches the mockup but still feels weak, generic, or unpolished.

## Workflow

1. Read the target UI, `visual.config.json`, and the latest `artifacts/reports/visual-report.json`.
2. Inspect typography, spacing, color, layout, responsive behavior, and UX copy as separate concerns.
3. Prefer small, evidence-backed improvements over redesigning the page.
4. Keep exact mockup mode faithful to the provided structure. Do not reinterpret layout unless the contract is in `design_dna` mode.
5. Run `npm run validate:ui` after changes and use the design, typographyColor, and contract components as feedback.

## References

- `references/typography.md`
- `references/spacing.md`
- `references/color.md`
- `references/layout.md`
- `references/responsive.md`
- `references/anti-patterns.md`
