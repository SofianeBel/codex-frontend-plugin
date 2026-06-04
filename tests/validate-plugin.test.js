import assert from "node:assert/strict";
import test from "node:test";
import { validateSkillFrontmatterText } from "../scripts/validate-plugin.js";

test("skill frontmatter descriptions with colon text must be quoted", () => {
  assert.throws(
    () => validateSkillFrontmatterText(`---
name: design-quality
description: Audit design quality: typography and spacing.
---

# Design Quality
`),
    /quote description/
  );
});

test("quoted skill frontmatter descriptions can contain colon text", () => {
  assert.doesNotThrow(() => validateSkillFrontmatterText(`---
name: design-quality
description: "Audit design quality: typography and spacing."
---

# Design Quality
`));
});
