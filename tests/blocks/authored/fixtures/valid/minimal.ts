/**
 * authored-block-header: 1
 * scaffold-version: 1.0.0
 * sender: alice@consulting.example
 * timestamp: 2026-05-27T10:00:00Z
 * slug: minimal-test-block
 */

import { defineAuthoredBlock } from "../../../../../src/blocks/authored/defineAuthoredBlock";

export default defineAuthoredBlock({
  slug: "minimal-test-block",
  title: "Minimal Test Block",
  paletteLabel: "Minimal",
  content: "none",
  attrs: [],
  template: { kind: "text", value: "Hello" },
});
