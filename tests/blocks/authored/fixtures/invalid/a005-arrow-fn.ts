/**
 * authored-block-header: 1
 * scaffold-version: 1.0.0
 * sender: alice@consulting.example
 * timestamp: 2026-05-27T10:00:00Z
 * slug: arrow-fn-block
 */

import { defineAuthoredBlock } from "../../../../../src/blocks/authored/defineAuthoredBlock";

// INVALID: uses arrow function expression inside the manifest (A005).
export default defineAuthoredBlock({
  slug: "arrow-fn-block",
  title: "Arrow Fn Block",
  paletteLabel: "Arrow",
  content: "none",
  // @ts-expect-error — intentionally invalid for lint testing
  attrs: [() => "bad"],
  template: { kind: "text", value: "Hello" },
});
