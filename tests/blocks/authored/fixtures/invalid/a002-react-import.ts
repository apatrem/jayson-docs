/**
 * authored-block-header: 1
 * scaffold-version: 1.0.0
 * sender: alice@consulting.example
 * timestamp: 2026-05-27T10:00:00Z
 * slug: bad-import-block
 */

// INVALID: imports from 'react' which is not on the Authored allow-list (A002).
import React from "react";

import { defineAuthoredBlock } from "../../../../../src/blocks/authored/defineAuthoredBlock";

export default defineAuthoredBlock({
  slug: "bad-import-block",
  title: "Bad Import Block",
  paletteLabel: "Bad",
  content: "none",
  attrs: [],
  template: { kind: "text", value: "Hello" },
});
