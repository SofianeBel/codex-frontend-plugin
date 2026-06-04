---
name: anti-ai-slop
description: Detect and remove generic AI-generated UI fingerprints such as templated SaaS structure, fake chrome, invented metrics, and repeated card rhythms.
---

# Anti-AI-Slop

Use this skill when the UI is technically correct but looks generated, templated, or interchangeable with many AI-made pages.

## Workflow

1. Read the current UI and latest `artifacts/reports/visual-report.json`.
2. Check the Hallmark component for severe anti-slop failures first.
3. In `exact_mockup` mode, block slop without changing the mockup's intended structure.
4. In `design_dna` mode, extract visual rhythm and personality without copying pixels.
5. Run `npm run hallmark:audit` or the full `npm run validate:ui` after changes.

## References

- `references/hallmark-inspired.md`
- `references/structural-fingerprints.md`
- `references/slop-gates.md`
- `references/component-states.md`
