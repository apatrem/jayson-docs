# Reference: Authored Block

This directory contains the **canonical scaffold** for an Authored block (Tier 3).
When the LLM generates a new Authored block for a consultant, it produces a file
that matches this pattern exactly.

> **Architecture:** ADR-0007 (capability restriction), ADR-0008 (registry manifest
> shape), ADR-0013 (authored blocks are declarative data, never executed as code).

---

## What an Authored block is

An Authored block is a consultant-created, peer-to-peer-shareable block that
extends the editor's block palette beyond the 15 Standard blocks and the ~15
Brand blocks installed at setup.  Unlike Standard and Brand blocks, Authored
blocks ship **without a human review gate** — the Rust AST lint + runtime
watchdog are the only safety layers.

To keep that gate tractable, Authored blocks are restricted to a
**simple-container subset** of Standard-block capabilities (ADR-0007):

| Capability                           | Standard | Brand | Authored |
|--------------------------------------|----------|-------|----------|
| Rich-text content                    | ✅        | ✅    | ✅        |
| Static attrs (string/enum/num/bool)  | ✅        | ✅    | ✅        |
| Repeated-item list attrs             | ✅        | ✅    | ✅        |
| Brand-token consumption              | ✅        | ✅    | ✅        |
| Atom node with JSON payload          | ✅        | ✅    | ❌        |
| Custom side panel                    | ✅        | ✅    | ❌        |
| ECharts / Mermaid embed              | ✅        | ✅    | ❌        |

If a consultant's need exceeds the subset, they escalate to a Brand-block request
(devops + human review per D-09).

---

## File format

An Authored block is a single `.ts` file default-exporting one
`defineAuthoredBlock({ ... })` call.

```
reference/authored-block/
  sector-risk-summary.ts   ← worked example (copy this as the codegen base)
  sector-risk-summary.test.ts  ← tests for the worked example
  README.md                ← this file
```

When a new block is generated, the output lives in `generated-blocks/pending/`
with a manifest header at the top of the file (ADR-0005, implemented in T-161).

---

## Allowed imports

Authored block files may import ONLY:

```typescript
import { defineAuthoredBlock } from "../../src/blocks/authored/defineAuthoredBlock";
// optionally: type-only imports of AttrRef, ColorToken, AuthoredBlockManifest
```

Forbidden imports: `react`, `@tiptap/*`, `echarts`, `mermaid`, `fs`, `path`,
`fetch`, or any module outside the narrow allow-list above.  The Rust AST
validator rejects the file on load if a forbidden import appears.

---

## Manifest structure

```typescript
defineAuthoredBlock({
  // ── Identity ──────────────────────────────────────────────────────────────
  slug:         string,           // kebab-case, unique per sender email
  title:        string,           // "Add block" dialog label
  paletteLabel: string,           // ≤ 24 chars, palette chip label

  // ── Content ───────────────────────────────────────────────────────────────
  content: "rich-text" | "none",  // whether a ProseMirror editable area exists

  // ── Attrs ─────────────────────────────────────────────────────────────────
  // Drives the auto-generated form panel.  Order = top-to-bottom panel order.
  attrs: [
    { kind: "string",        fieldId, label, placeholder?, maxLength?, defaultValue? },
    { kind: "enum",          fieldId, label, options: [{ value, label }][], defaultValue? },
    { kind: "number",        fieldId, label, min?, max?, step?, defaultValue? },
    { kind: "bool",          fieldId, label, defaultValue? },
    { kind: "repeated-item", fieldId, label, itemFields: SimpleAttrField[], minItems?, maxItems? },
  ],

  // ── Template ──────────────────────────────────────────────────────────────
  // Declarative renderer tree.  Pure data — no JSX, no functions.
  // The runtime expander (T-160) turns this into React elements.
  template: RenderNode,
})
```

### Render nodes

| Node kind         | Key fields                              | Notes                              |
|-------------------|-----------------------------------------|------------------------------------|
| `text`            | `value: string \| AttrRef`, `color?`   | Inline text                        |
| `heading`         | `level: 1–4`, `text`                   | Section heading                    |
| `box`             | `padding?`, `background?`, `children`  | Block container                    |
| `row`             | `gap?`, `align?`, `children`           | Horizontal flex                    |
| `column`          | `gap?`, `children`                     | Vertical flex                      |
| `badge`           | `text`, `background?`, `foreground?`   | Chip / label                       |
| `rich-text-slot`  | —                                       | Replaced by ProseMirror editable   |
| `for-each`        | `fieldId`, `item`                      | Repeats per `repeated-item` entry  |

**`AttrRef`:** `{ $ref: "fieldId" }` — resolved to the attr's runtime value.  
**`ColorToken`:** `{ $token: "colors.brand.primary" }` — resolved via brand-token system.

---

## Capability ceiling — compile-time guarantee

Because `AuthoredBlockManifest` has **no field that accepts** a TipTap `Node`,
a React `ComponentType`, an ECharts instance, or any function value, the
forbidden Standard-block patterns are **TypeScript compile errors** for Authored
blocks, not lint warnings:

```typescript
// ✅ Valid — matches AttrFieldDef and RenderNode
defineAuthoredBlock({ slug: "my-block", ..., template: { kind: "text", value: "hello" } })

// ❌ Compile error — 'tiptapNode' does not exist in type 'AuthoredBlockManifest'
defineAuthoredBlock({ slug: "my-block", ..., tiptapNode: someNode })

// ❌ Compile error — 'renderer' does not exist in type 'AuthoredBlockManifest'
defineAuthoredBlock({ slug: "my-block", ..., renderer: MyComponent })

// ❌ Compile error — value must be string | AttrRef, not () => string
defineAuthoredBlock({ slug: "my-block", ..., template: { kind: "text", value: () => "hi" } })
```

The Rust AST validator (T-163) provides a second enforcement layer at receive
time, verifying that every value inside the manifest literal is statically
evaluable (no function nodes in the AST).

---

## Writing tests for an Authored block

Copy `sector-risk-summary.test.ts` as a starting point.  The test layers are
simpler than Standard blocks (no TipTap node test layer):

1. **Manifest shape** — manifest properties have correct types and values.
2. **Attrs** — each field definition has the right kind, fieldId, label.
3. **Template** — the render tree is well-formed (kinds, required children, refs).
4. **Runtime (T-160+)** — calling `defineAuthoredBlock()` produces a working
   `BlockRegistryRecord` (these tests are stubs until T-160 lands).

---

## What changes in T-160

T-160 implements the runtime expansion in `src/blocks/authored/defineAuthoredBlock.ts`:
replacing the `throw` stub with real logic that derives a Zod schema from the attrs,
builds a TipTap node + form-panel node view, expands the template tree into a React
renderer, and generates toPm/fromPm.  The manifest format above is stable across
T-159 and T-160 — only the factory body changes.
