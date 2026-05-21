# Reference block: Callout

This directory contains the **canonical pattern** for implementing one of the 15 pre-built blocks. The remaining 14 blocks follow this exact 4-file shape — see `BLOCK_IMPLEMENTATION_GUIDE.md` for copy-pattern instructions.

## Files

| File | Purpose | Lines |
|---|---|---|
| `schema.ts` | Zod schema + TypeScript type + variant-to-token helper | ~80 |
| `Callout.tsx` | React renderer for HTML/PDF output | ~90 |
| `CalloutNode.tsx` | TipTap node + React node view + mapping helpers | ~150 |
| `callout.test.ts` | Vitest tests (schema/renderer/mapping/editor) | ~200 |

## Where they live in the final repo

Per the `BUILD_BRIEF.md` repo layout, the files go to:

| Reference file | Production path |
|---|---|
| `reference/callout/schema.ts` | `src/schema/blocks/callout.ts` |
| `reference/callout/Callout.tsx` | `src/renderer/blocks/Callout.tsx` |
| `reference/callout/CalloutNode.tsx` | `src/editor/nodes/CalloutNode.tsx` |
| `reference/callout/callout.test.ts` | `tests/blocks/callout.test.ts` |

The reference files import using relative paths (`../../src/...`); the production files import using clean paths.

## What each file is responsible for

### `schema.ts`
The single source of truth for the callout's data shape. The renderer and node view both consume this schema's types — they never define their own. The variant-to-token helper (`calloutTintTokenFor`) lives here because it's part of the variant's *meaning*, not the renderer's display logic.

### `Callout.tsx`
Pure rendering. Takes a `CalloutBlock`, returns HTML via React. Reads brand tokens via the `useBrandTokens()` hook — never inlines colors or fonts. Must run **without the editor** (memo §2 invariant). Used by both the HTML renderer and the PDF export pipeline.

### `CalloutNode.tsx`
Two responsibilities:
1. **The TipTap node** — registers the block with the editor, defines `attrs` and commands (`insertCallout`, `setCalloutVariant`).
2. **The node view** — a React component that renders the block's *editing UI* (not its production styling). This is what consultants interact with when the block is in the editor.

Also exports the **per-block mapping helpers** (`calloutBlockToProseMirror`, `proseMirrorToCalloutBlock`) used by `src/editor/mapping.ts` to do the DocModel <-> ProseMirror round-trip (M4 acceptance).

### `callout.test.ts`
Five test layers (mandatory for every block):
1. Schema accepts all valid fixtures
2. Schema rejects each invalid case with the right error path
3. Renderer produces deterministic HTML + uses brand tokens (not hard-coded)
4. Mapping round-trips losslessly in both directions
5. Editor can insert + modify the block via registered commands

## Why this pattern is the right shape to copy

- **Schema separation** — the schema is the contract. If the renderer breaks, the schema still works. If a node view breaks, the schema still works.
- **Renderer purity** — same input -> same output. This is what makes PDF export reliable and snapshot tests stable.
- **Mapping helpers co-located with the node** — when someone changes the node's `attrs`, the mapping is right there in the same file. Harder to drift.
- **Test layers map 1:1 to acceptance criteria** — schema tests cover M1, renderer tests cover M2, mapping tests cover M4, editor tests cover M4.

## Anti-patterns to avoid (seen in early drafts of similar systems)

- ❌ Storing the variant -> color mapping in CSS. Brand tokens must flow through TypeScript so the renderer can be SSR'd without a browser-rendered stylesheet.
- ❌ Putting the editing UI in `Callout.tsx`. That couples editing concerns to production rendering — they evolve differently.
- ❌ Defining `attrs` in the node view component. Attrs live in the node definition (`addAttributes`) — the node view *consumes* them.
- ❌ Skipping the mapping round-trip test. This is THE test that catches DocModel<->editor drift early.
- ❌ Reading brand tokens via global state in `Callout.tsx`. Always via the provider/hook — keeps the component testable.
