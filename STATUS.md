# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T15:07:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-140** — Registry loaders (schema + runtime, both static for M9a) (2h).
- Depends-on: T-139 — ✓

## Progress since the previous fire

- ✅ **T-139 closed this fire** — Registry API + per-block schema/runtime module split:
  - **`src/blocks/defineBlock.ts`** (NEW) — `defineBlock<TBlock>()` factory. Input: schemaName,
    schema (Zod), allowedAttrs, paletteLabel, tiptapNode (TipTap Node), renderer (React
    component), toPm/fromPm mapping functions. Returns typed `BlockRegistryRecord` split
    between `SchemaEntry` (pure, schema-only) and runtime fields. Explicit property-by-property
    cast to avoid `as unknown as` coercions while preserving generic typing at call sites.
  - **`src/blocks/schema-registry.ts`** (NEW) — pure registry typed as `SchemaEntry[]`,
    currently empty. Populated by T-140 static imports.
  - **`src/blocks/runtime-registry.ts`** (NEW) — full runtime registry typed as
    `BlockRegistryRecord[]`, currently empty. Populated by T-140/T-141.
  - **`tests/blocks/schema-purity.test.ts`** (NEW) — walks src/schema/** (29 files) and
    src/blocks/*/schema.ts (0 files, T-141 not yet done). For each, follows relative
    imports transitively and fails if react, @tiptap/*, or src/renderer/ appears. All 31
    tests pass (29 schema files + 2 placeholder assertions for the empty block-schema set).
  - All gates green: tsc ✓, lint ✓, 627/627 tests pass.

- ✅ **T-137 closed previous fire** — URL-attribute lint rule (ADR-0006 prereq).
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 206   Done: 158 (77%)   Blocked: 0   Waiting: 2   Open: 45   Skipped: 1

## Recent commits

(pending this fire's commit)
T-137: URL-attribute lint rule (ADR-0006 prereq)
T-136: watchdog error boundary (ADR-0006 prereq)

## CI status (origin/main)

Latest completed run on `main`: success (post-T-137 push)

T-139 done; T-140 (registry loaders) is next eligible.
