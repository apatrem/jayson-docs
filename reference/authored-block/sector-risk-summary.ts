/**
 * Reference Authored block: Sector Risk Summary
 *
 * A worked example of the defineAuthoredBlock() pattern.
 * Codegen target — copy this file when generating a new Authored block.
 *
 * ## What this block does
 * Summarises a sector's risk level and trend in a styled container, with a
 * rich-text body for analyst commentary.  Typical use: proposal risk section.
 *
 * ## Constraints (ADR-0007, ADR-0013)
 * This file is parsed as DATA by the Rust AST validator at receive time.
 * It must contain:
 *   1. (optional) typed imports of defineAuthoredBlock, brand-token types, schema types
 *   2. exactly ONE default export: `defineAuthoredBlock({ ... })`
 *   3. nothing else — no other top-level statements, no side effects
 *
 * Every value inside defineAuthoredBlock({ ... }) must be statically
 * evaluable: string/number/boolean/null literals, array/object literals of
 * the same, AttrRef ({ $ref: "fieldId" }), ColorToken ({ $token: "path" }).
 * No function expressions, arrow functions, JSX, or non-literal template strings.
 *
 * The runtime expander (T-160) turns this manifest into a TipTap node +
 * form-based node view + React renderer + toPm/fromPm, all built from
 * app-bundled code.  This file never executes — it only supplies the data.
 */

// Authored block manifests may import ONLY:
//   - defineAuthoredBlock (this helper)
//   - brand-token type aliases  (ColorToken, AttrRef)
//   - schema-type symbols       (e.g. z from zod — if needed for future type hints)
// No React, no TipTap, no echarts, no fs, no fetch.
import { defineAuthoredBlock } from "../../src/blocks/authored/defineAuthoredBlock";

export default defineAuthoredBlock({
  // ── Identity ──────────────────────────────────────────────────────────────
  slug: "sector-risk-summary",      // kebab-case; unique per sender
  title: "Sector Risk Summary",     // displayed in the "Add block" dialog
  paletteLabel: "Sector Risk",      // short chip (≤ 24 chars)
  content: "rich-text",             // block has a ProseMirror editable body

  // ── Attr field definitions ─────────────────────────────────────────────────
  // These drive the auto-generated form panel in the editor sidebar.
  // Ordering here matches the top-to-bottom order in the panel.
  attrs: [
    {
      kind: "string",
      fieldId: "sectorName",
      label: "Sector",
      placeholder: "e.g. Energy Storage",
      maxLength: 80,
      defaultValue: "",
    },
    {
      kind: "enum",
      fieldId: "riskLevel",
      label: "Risk level",
      options: [
        { value: "low",    label: "Low"    },
        { value: "medium", label: "Medium" },
        { value: "high",   label: "High"   },
      ],
      defaultValue: "medium",
    },
    {
      kind: "enum",
      fieldId: "trend",
      label: "Trend",
      options: [
        { value: "improving",    label: "Improving ↑"    },
        { value: "stable",       label: "Stable →"       },
        { value: "deteriorating", label: "Deteriorating ↓" },
      ],
      defaultValue: "stable",
    },
  ],

  // ── Renderer template ──────────────────────────────────────────────────────
  // Pure data.  No JSX, no functions.  The runtime expander turns this tree
  // into React elements using built-in code only.
  //
  // Layout: a styled box containing a row (heading + badges) above the
  // rich-text body.
  template: {
    kind: "column",
    gap: 2,
    children: [
      {
        kind: "box",
        padding: 3,
        background:    { $token: "colors.semantic.surfaceBackground" },
        borderRadius: 4,
        children: [
          {
            kind: "row",
            gap: 2,
            align: "space-between",
            children: [
              {
                kind: "heading",
                level: 3,
                // { $ref: "fieldId" } → replaced with the attr's current value
                text: { $ref: "sectorName" },
              },
              {
                kind: "row",
                gap: 1,
                children: [
                  {
                    kind: "badge",
                    text:       { $ref: "riskLevel" },
                    background: { $token: "colors.semantic.accentSubtle" },
                  },
                  {
                    kind: "badge",
                    text: { $ref: "trend" },
                  },
                ],
              },
            ],
          },
        ],
      },
      // The rich-text-slot is replaced by a live ProseMirror region at runtime.
      // It must appear at most once per template (content: "rich-text" only).
      {
        kind: "rich-text-slot",
      },
    ],
  },
});
