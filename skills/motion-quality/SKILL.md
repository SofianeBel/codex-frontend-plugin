---
name: motion-quality
description: "Audit and improve UI motion so animations are purposeful, subtle, accessible, performant, and not generic AI-generated decoration."
---

# Motion Quality

Use this skill when adding, reviewing, or fixing UI motion.

## Workflow

1. Identify the project context: productivity, dashboard, marketing, playful, or creative.
2. Decide whether each animation should exist before tuning it.
3. Check duration, easing, animated properties, repetition, and reduced-motion behavior.
4. Prefer transform and opacity over layout properties.
5. Run `npm run motion:audit`, `npm run motion:runtime`, or full `npm run validate:ui`.

## References

- `references/motion-principles.md`
- `references/motion-anti-patterns.md`
- `references/reduced-motion.md`
