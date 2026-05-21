# DocModel ⇄ Editor mapping orchestrator

The top-level dispatch that turns a `DocModel` into a TipTap document and back. Per-block mapping helpers live in each block's `*Node.tsx`; this is the file that knows about *sections*, *slides*, *comments*, and the kind discriminator.

## Files

| File | Purpose |
|---|---|
| `mapping.ts` | The orchestrator: `docModelToProseMirror`, `proseMirrorToDocModel`, dispatch per block.type |
| `mapping.test.ts` | Top-level losslessness tests across the sample fixtures |

Production paths: `src/editor/mapping.ts` and `tests/mapping-roundtrip.test.ts`.

## The losslessness invariant

```typescript
proseMirrorToDocModel(docModelToProseMirror(doc)) deep-equals doc
```

This is **the M4 acceptance criterion** (task T-89). If this invariant ever breaks for any block type, the failure points at:
1. The per-block mapping helpers (most likely cause — they forgot a field).
2. The orchestrator (less likely — it just dispatches).
3. The schema (very rare — a field was added without updating either of the above).

## Why the orchestrator is separate from per-block helpers

Two reasons:

1. **Per-block helpers handle leaf shapes.** They know about `attrs`, `content`, ProseMirror node names. They shouldn't know about sections, slides, or the doc kind.

2. **The orchestrator handles structure.** It knows the doc has `sections` (or `slides`), each containing ordered `blocks`, plus top-level `comments` and `meta`. Putting this in one place keeps the structure-vs-leaf concerns clean.

## How to add a new block to the dispatch

When a new block is implemented (per `BLOCK_IMPLEMENTATION_GUIDE.md`):

1. **Import its two mapping helpers** at the top of `mapping.ts`:
   ```typescript
   import {
     fooBlockToProseMirror,
     proseMirrorToFooBlock,
   } from "../foo/FooNode";       // or src/editor/nodes/FooNode in production
   ```

2. **Add an arm to `blockToProseMirror`** (the forward dispatch):
   ```typescript
   case "foo":
     return fooBlockToProseMirror(block);
   ```

3. **Add an arm to `proseMirrorToBlock`** (the reverse dispatch):
   ```typescript
   case "foo":
     return proseMirrorToFooBlock(node as never);
   ```

4. **Add a fixture using the new block** to either `examples/sample-proposal.yaml` or `examples/sample-deck.yaml`. The orchestrator test (`mapping.test.ts`) automatically picks it up — no test changes needed.

That's it. The compile-time exhaustiveness check via `assertNever(_b: never)` catches the case where you add the block to the union but forget step 2.

## What this orchestrator does NOT handle

- **Schema validation.** It assumes inputs are already schema-valid (call `validateDocModel` first on save, separately on load).
- **Comment anchoring.** Comments reference `blockId` — the orchestrator preserves the comments array, but it doesn't verify that the referenced blocks still exist. That's a separate consistency check in `src/comments/consistency.ts`.
- **Migrations.** When `schemaVersion` bumps, the migration happens *before* the orchestrator runs. The orchestrator only sees the current version.

## Running the tests

```bash
npm test -- mapping
```

Should pass against `examples/sample-proposal.yaml` and `examples/sample-deck.yaml`. If it fails, the test output names the diff path (e.g. `sections.0.blocks.2.body`) and you can localize the bug to one block's mapping helpers.

## When the test fails — debugging recipe

1. **Add a `console.log(JSON.stringify(pm, null, 2))`** in the test right after `docModelToProseMirror(original)`. Compare the structure to what you'd expect.
2. **Find which block type is failing**: TypeScript will show the expected vs. actual deep-equal diff. The first differing path tells you which block.
3. **Re-run that block's per-block test file** (e.g. `chart.test.ts`). If it passes, the issue is in the orchestrator's dispatch (rare). If it fails, the issue is in the per-block helpers.
4. **The most common bug**: a field was added to the schema but not to the per-block mapping helpers. Fix the helper; both tests pass.
