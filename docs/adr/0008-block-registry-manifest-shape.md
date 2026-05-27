# Block registry: two manifest APIs — imperative `defineBlock` for Standard/Brand, declarative `defineAuthoredBlock` for Authored

**Status:** accepted (concretises the registry refactor flagged in ADR-0004 + ADR-0007; foundation for M9 implementation tasks)
**Date:** 2026-05-27

## Context

ADR-0004 introduced the three-tier block library and identified that all three tiers need a single-file portable registration surface, but did not specify what the registration API looks like. ADR-0007 restricted Authored blocks to a simple-container subset, narrowing the codegen target. The remaining decisions are: (a) one API or two; (b) imperative TipTap node API or declarative scaffold; (c) where the manifest file lives and how it exports.

Today's 4-file pattern in `reference/callout/` (schema + node + nodeView + renderer + mapping) spreads each block across five touchpoints (see prior exploration in this session). Reshaping all 15 Standard blocks is in scope; the question is whether to do it inside one unified API or two.

## Decision

**Two APIs in the same registry.**

- `defineBlock({...})` — imperative. Takes a fully-constructed TipTap `Node.create({...})`, a React node view, a React renderer, `toPm`/`fromPm` mapping functions, an `allowedAttrs` array, and palette metadata. Used by all 15 Standard blocks and by Brand blocks installed at setup. Brand blocks rely on the D-09 human review gate to catch imperative-code mistakes the setup AI makes.
- `defineAuthoredBlock({...})` — declarative. Takes a Zod schema for the block's attrs, an optional `RichTextContent` slot, a small set of declarative attr widgets (string field, enum picker, number, bool, repeated-item list), and a declarative renderer template. The registry expands the manifest into a TipTap node + node view + renderer + mapping. Cannot express atom nodes, side panels, or echarts/mermaid (ADR-0007 capability restriction is enforced at the type level, not just by lint).

Internally, `defineAuthoredBlock` builds on `defineBlock` — they share one registry record shape. Two surfaces, one runtime.

**File layout (amended 2026-05-27 — see Amendment below):**

- One folder per block at `src/blocks/<name>/`, containing two files:
  - **`schema.ts`** — pure. Zod schema + `schemaName` + `allowedAttrs` + `paletteLabel`. No React, no TipTap, no `src/renderer/` imports. Importable from the schema layer, the LLM-validation surface, the setup pipeline, and any Node-side tool without dragging in the UI bundle.
  - **`index.ts`** — runtime. Imports its own `./schema.ts` plus TipTap/React/per-block view/renderer code. Default-exports `defineBlock({...})` (or `defineAuthoredBlock({...})`).
- Two registries instead of one:
  - **`src/blocks/schema-registry.ts`** — pure, imports only `*/schema.ts` files. A static-import test fails CI if any block's `schema.ts` transitively imports React, TipTap, or anything from `src/renderer/`.
  - **`src/blocks/runtime-registry.ts`** — full, imports `*/index.ts` files. Joins runtime fields with the schema-registry by `schemaName` at boot.
- For Standard blocks: both registries import statically (`import calloutBlock from './callout';`).
- For Brand + Authored blocks: loaded dynamically from `generated-blocks/active/` via a folder scan; the file is parsed (NOT executed — see ADR-0013) for its default export shape; the lint (ADR-0001 + ADR-0006) runs before activation.

**Loader contract:**

- Static (Standard): both registries import each block's `schema.ts` and `index.ts` directly.
- Dynamic (Brand + Authored): the parser extracts the `defineBlock(...)` / `defineAuthoredBlock(...)` data from the file's AST (per ADR-0013 — Authored blocks are *parsed as data, never executed as code*); the lint validates the extracted shape; on pass, both registries gain a new entry built from the extracted data.

### Amendment 2026-05-27 — per-block schema/runtime split + two registries

This ADR originally specified one `src/blocks/<name>/index.ts` per block and one `src/blocks/registry.ts`. M9 plan review surfaced that a single index file forces the schema-registry to transitively import React/TipTap (defeating schema-layer purity required by memo §2). The file-layout section above now reflects the per-block `schema.ts` + `index.ts` split and the two registries; the original two-API decision (`defineBlock` vs `defineAuthoredBlock`) is unchanged. ADR-0013 separately formalises the data-not-code interpretation of the Authored file format that the dynamic loader depends on.

## Rejected alternatives

- **One unified declarative API across all three tiers.** Would mean inventing declarative shapes for every awkward Standard-block case (Chart's atom-node-with-JSON-payload, KpiCards' typed-grid panel, Table's column-schema editor…). A quarter of work for no behaviour change at the Standard tier. Rejected.
- **One unified imperative API across all three tiers.** Authored blocks would inherit TipTap's full API surface; the AI codegen target would be much wider; the ADR-0007 capability restriction would have to be enforced *only* by lint. Removes the type-level guarantee that's the main advantage of the two-API split. Rejected.
- **Three APIs (Standard imperative, Brand wider-declarative, Authored narrow-declarative).** Brand blocks are human-reviewed (D-09), so the AI can produce imperative code and a human catches mistakes; a dedicated Brand declarative API doubles the codegen surface for no safety gain. Rejected.
- **Manifest as a named export instead of default export.** Named exports require the loader to know the export name. Default export means one strict shape per file, which is also the easiest lint constraint to enforce ("file must default-export `defineBlock(...)` or `defineAuthoredBlock(...)`, nothing else exported"). Default export wins.
- **Per-block files at the root of `src/blocks/` (e.g., `src/blocks/callout.ts`) instead of folders.** Folders accommodate per-block tests, fixtures, and (for Standard blocks) any block-specific stylesheets without changing the registry. Folders win.

## Consequences

- The 15 Standard blocks each undergo a mechanical migration: existing `src/editor/nodes/<Name>Node.tsx` + `src/renderer/blocks/<Name>.tsx` + the relevant `src/editor/mapping.ts` switch arms collapse into `src/blocks/<name>/index.ts`. ~1–2 hours per block, low behaviour risk. Trackable as 15 atomic tasks in TASKS.md.
- `src/editor/mapping.ts`'s two ~30-case switch statements are deleted; the registry iterates instead. Editor.tsx's `blockExtensions` array and `allowedAttrsForNode` switch are also derived from the registry, not maintained by hand.
- The canonical reference patterns in `reference/callout/` and `reference/chart/` need rewriting to the new shape, otherwise the `next-task` loop keeps producing blocks in the deprecated pattern. The rewrite is a prerequisite of the migration.
- `defineAuthoredBlock` is a new API that doesn't exist yet — the scaffold, the declarative widgets, and the renderer-template expansion all need designing in M9. This is the bulk of the registry work; the imperative `defineBlock` is essentially a packaging refactor.
- The dynamic loader for `generated-blocks/active/` runs the lint at receive time (ADR-0005 + ADR-0006), then the watchdog at render time. Both are pre-existing components; the loader is new glue.
- A future capability promotion (the deferred feature in ADR-0007) means widening `defineAuthoredBlock`'s declarative shape — a typed change to the API, not just a lint loosening. Slightly more friction than a lint-only restriction, accepted as the cost of the type-level guarantee.
