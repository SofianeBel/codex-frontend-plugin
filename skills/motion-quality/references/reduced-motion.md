# Reduced Motion

- Every animation must have a `prefers-reduced-motion` fallback.
- Reduced-motion mode should remove nonessential movement, not hide content.
- Keep focus, hover, and active states visible without motion.
- Runtime checks should pass with Playwright `reducedMotion: "reduce"`.
