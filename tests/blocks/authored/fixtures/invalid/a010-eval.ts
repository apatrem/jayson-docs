/**
 * authored-block-header: 1
 * scaffold-version: 1.0.0
 * sender: alice@consulting.example
 * timestamp: 2026-05-27T10:00:00Z
 * slug: eval-block
 */

import { defineAuthoredBlock } from "../../../../../src/blocks/authored/defineAuthoredBlock";

// INVALID: uses 'eval' which is a forbidden identifier (A010).
const _bad = eval("1 + 1");

export default defineAuthoredBlock({
  slug: "eval-block",
  title: "Eval Block",
  paletteLabel: "Eval",
  content: "none",
  attrs: [],
  template: { kind: "text", value: "Hello" },
});
