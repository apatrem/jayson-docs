# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T15:30:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-141** — Folder layout scaffolding (legacy-wrapper approach, schema + runtime per block) (3h).
- Depends-on: T-140 — ✓

Also eligible in parallel:
- **T-141a** — Example brand theme + structural HTML snapshot baselines (4h). Depends-on: T-136 ✓, T-137 ✓.

## Progress since the previous fire

- ✅ **T-138 closed this fire** — Reference pattern refresh:
  - **`reference/callout/schema.ts`** (UPDATED) — added `schemaEntry` export typed with an
    inline `satisfies` clause (avoids importing `SchemaEntry` from `defineBlock.ts`, which
    would transitively drag in TipTap and fail the schema-purity test).
  - **`reference/callout/index.ts`** (NEW) — `defineBlock<CalloutBlock>({...})` manifest;
    wraps `CalloutTipTapNode`, `Callout`, and the mapping helpers into the canonical
    registry-ready shape. Default-exports the `BlockRegistryRecord`.
  - **`reference/callout/README.md`** (UPDATED) — documents the new two-file shape
    (`schema.ts` pure + `index.ts` runtime), the registry split, and updated file table.
  - **`reference/chart/schema.ts`** (UPDATED) — same `schemaEntry` export added for the
    atom-node pattern block.
  - **`reference/chart/index.ts`** (NEW) — `defineBlock<ChartBlock>({...})` manifest;
    documents the JSON-payload pattern (`toPm` serialises block → single `payload` attr,
    `fromPm` deserialises). Serves as the copy-source for kpi-cards, risk-matrix, team,
    roadmap, timeline, diagram.
  - **`reference/chart/README.md`** (UPDATED) — two-file shape docs, updated file table,
    removed obsolete "When implementing T-32" section.
  - **`reference/mapping/README.md`** (UPDATED) — ⚠️ DEPRECATED header + registry-iteration
    pattern snippet showing the replacement; points readers at reference/callout/ or
    reference/chart/ as the new copy-sources.
  - All gates green: tsc ✓, lint ✓, 627/627 tests pass.

- ✅ **T-140 closed previous fire** — Registry loaders (loadAllSchemas + loadAllBlocks).
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 209   Done: 163 (78%)   Blocked: 0   Waiting: 2   Open: 43   Skipped: 1

## Recent commits

(pending this fire's commit)
T-140: registry loaders (schema + runtime, both static for M9a)
T-139: registry API + per-block schema/runtime module split
T-137: URL-attribute lint rule (ADR-0006 prereq)

## CI status (origin/main)

Latest completed run on `main`: success (post-T-140 push)

T-138 done; T-141 (folder layout scaffolding) is next eligible.
