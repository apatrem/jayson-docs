# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T15:50:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-141b** — Make `mapping.ts` registry-aware (hybrid) (depends on T-141 ✓).
Also eligible: **T-141a** (brand theme + snapshots, depends on T-136 ✓, T-137 ✓).

## Progress since the previous fire

- ✅ **T-141 closed this fire** — Folder layout scaffolding (legacy-wrapper approach):
  - **`src/blocks/<name>/schema.ts`** × 15 (NEW) — pure re-export wrapper for each Standard
    block. Re-exports `src/schema/blocks/<name>.ts` via `export *` and adds a `schemaEntry`
    export typed via `satisfies` with `z.ZodType<unknown>` (avoiding any import from
    `defineBlock.ts` which would transitively pull in TipTap and fail the purity check).
  - **`src/blocks/<name>/index.ts`** × 15 (NEW) — legacy-wrapper runtime manifest.
    Imports `./schema.ts` + legacy `src/editor/nodes/<Name>Node.tsx` +
    `src/renderer/blocks/<Name>.tsx`, wraps them in `defineBlock<TBlock>({...})`,
    default-exports the `BlockRegistryRecord`. Two casts documented: schema `._input`
    vs `._output` mismatch for `.default()` fields (safe, output matches TBlock); and
    `ProseMirrorNode.attrs: Record<string,unknown>` → specific PmNode (safe via `unknown`
    intermediary). Image and Team renderers need `ComponentType<{ block: any }>` cast
    (their legacy renderers require extra `assetContext` prop supplied at the doc-render
    call site, not by the registry — wired in T-157b).
  - **`src/blocks/schema-registry.ts`** (UPDATED) — stub imports uncommented; all 15
    `schemaEntry` values now imported and returned by `loadAllSchemas()`.
  - **`src/blocks/runtime-registry.ts`** (UPDATED) — stub imports uncommented; all 15
    block manifests now imported and returned by `loadAllBlocks()`.
  - **`tests/blocks/schema-purity.test.ts`** (UPDATED) — removed now-stale "no schema
    files exist yet (T-141 not yet scaffolded)" placeholder; combined into a single
    "all 15 block schema files are pure" test that verifies the count > 0 and iterates.
    All 30 purity tests pass (was 31 + stale stub).
  - Gates: tsc ✓, lint ✓, 626/626 tests pass (net -1: stale placeholder removed).

- ✅ **T-138 closed previous fire** — Reference pattern refresh.
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 209   Done: 164 (78%)   Blocked: 0   Waiting: 2   Open: 42   Skipped: 1

## Recent commits

(pending this fire's commit)
T-138: reference pattern refresh (new defineBlock shape + deprecate mapping/)
T-140: registry loaders (schema + runtime, both static for M9a)
T-139: registry API + per-block schema/runtime module split

## CI status (origin/main)

Latest completed run on `main`: success (post-T-138 push)

T-141 done; T-141b (mapping.ts registry-aware hybrid) is next eligible.
