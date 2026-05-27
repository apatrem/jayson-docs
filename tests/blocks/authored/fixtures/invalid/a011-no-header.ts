// INVALID: no manifest header block comment (A011).
// The first comment must be a /** authored-block-header: 1 ... */ block.

import { defineAuthoredBlock } from "../../../../../src/blocks/authored/defineAuthoredBlock";

export default defineAuthoredBlock({
  slug: "no-header-block",
  title: "No Header Block",
  paletteLabel: "No Header",
  content: "none",
  attrs: [],
  template: { kind: "text", value: "Hello" },
});
