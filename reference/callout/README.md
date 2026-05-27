# Reference block: Callout

This directory contains the **canonical pattern** for implementing one of the 15 pre-built blocks. All other blocks follow this shape — see `BLOCK_IMPLEMENTATION_GUIDE.md` for copy-pattern instructions.

## The new two-file shape (ADR-0008, since T-138)

Each block folder contains **two entry files** and a legacy implementation:

| File | Layer | Purpose |
|---|---|---|
| `schema.ts` | **Pure** | Zod schema + TS type + helpers + `schemaEntry` export. No React, no TipTap, no `src/renderer/` imports — enforced by `tests/blocks/schema-purity.test.ts`. |
| `index.ts` | **Runtime** | `defineBlock({...})` manifest. Imports `./schema.ts` + TipTap node + React renderer + mapping helpers. Default-exports the `BlockRegistryRecord` consumed by `runtime-registry.ts`. |
| `Callout.tsx` | Implementation | React renderer (HTML/PDF output). Imported by `index.ts`. |
| `CalloutNode.tsx` | Implementation | TipTap atom node + mapping helpers. Imported by `index.ts`. |
| `callout.test.ts` | Tests | 5-layer Vitest test suite (schema / render / mapping / editor). |

### Why two entry files?

The **schema-registry** (`src/blocks/schema-registry.ts`) imports only `schema.ts` files. It must be free of React/TipTap so it can be imported from:
- The LLM-validation surface (Node-side, no UI bundle)
- The setup pipeline
- Any schema-layer utility

The **runtime-registry** (`src/blocks/runtime-registry.ts`) imports `index.ts` files and gets the full `BlockRegistryRecord` including the TipTap node and React renderer.

```
schema-registry  ←  schema.ts  (pure)
runtime-registry ←  index.ts   (full manifest via defineBlock({...}))
```

## Where they live in the final repo

Per the registry pattern (T-141+), the production files go to:

| Reference file | Production path |
|---|---|
| `reference/callout/schema.ts` | `src/blocks/callout/schema.ts` |
| `reference/callout/index.ts` | `src/blocks/callout/index.ts` |
| `reference/callout/Callout.tsx` | *(in `src/blocks/callout/` after T-142 migration)* |
| `reference/callout/CalloutNode.tsx` | *(in `src/blocks/callout/` after T-142 migration)* |
| `reference/callout/callout.test.ts` | `tests/blocks/callout.test.ts` |

> **Note (pre-T-141):** The current production codebase still uses the legacy paths  
> `src/renderer/blocks/Callout.tsx` and `src/editor/nodes/CalloutNode.tsx`.  
> The migration (T-142) will fold these into `src/blocks/callout/`.

## What each file is responsible for

### `schema.ts`
The single source of truth for the callout's data shape. Pure — may only import from:
- `zod`
- Other `src/schema/` modules
- Sibling pure modules

Exports `schemaEntry` (consumed by `schema-registry.ts`) as a plain object satisfying the `SchemaEntry` shape without importing from `src/blocks/defineBlock.ts` (which would drag in TipTap types and fail the purity check).

### `index.ts`
Wires the pure schema, TipTap node, and React renderer into a `BlockRegistryRecord` via `defineBlock<CalloutBlock>({...})`. Default-exports the manifest. This is what `runtime-registry.ts` imports.

### `Callout.tsx`
Pure rendering. Takes a `CalloutBlock`, returns HTML via React. Reads brand tokens via `useBrandTokens()` — never inlines colors or fonts. Runs **without the editor** (memo §2 invariant).

### `CalloutNode.tsx`
Two responsibilities:
1. **The TipTap node** — registers the block with the editor, defines `attrs` and commands (`insertCallout`, `setCalloutVariant`).
2. **Mapping helpers** — `calloutBlockToProseMirror` / `proseMirrorToCalloutBlock` for the DocModel ↔ ProseMirror round-trip.

### `callout.test.ts`
Five test layers (mandatory for every block):
1. Schema accepts all valid fixtures
2. Schema rejects each invalid case with the right error path
3. Renderer produces deterministic HTML + uses brand tokens (not hard-coded)
4. Mapping round-trips losslessly in both directions
5. Editor can insert + modify the block via registered commands

## Anti-patterns to avoid

- ❌ Importing from `src/blocks/defineBlock.ts` in `schema.ts` — it transitively imports TipTap and breaks schema purity.
- ❌ Storing the variant → color mapping in CSS. Brand tokens must flow through TypeScript.
- ❌ Putting the editing UI in `Callout.tsx`. Editing concerns belong in `CalloutNode.tsx`.
- ❌ Defining `attrs` in the node view component. Attrs live in `addAttributes()`.
- ❌ Skipping the mapping round-trip test. It's the key test catching DocModel ↔ editor drift.
- ❌ Reading brand tokens via global state in `Callout.tsx`. Always via the provider/hook.
