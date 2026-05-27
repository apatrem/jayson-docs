# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T20:45:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-158** — Memo §3 + cross-reference cleanup (depends on T-135 ✓).

## Progress since the previous fire

- ✅ **T-157c closed this fire** — Schema-side registry wire-through.
  `src/blocks/schema-entry-type.ts` (new): pure `SchemaEntry` interface,
  extracted from `defineBlock.ts` so `schema-registry.ts` can import it
  without pulling in `@tiptap/core`.
  `src/blocks/defineBlock.ts`: re-exports `SchemaEntry` from new pure file.
  `src/blocks/schema-registry.ts`: imports `SchemaEntry` from pure file;
  now exports `BlockSchema` (z.discriminatedUnion of all 15 blocks) and
  `type Block` — derived from the registry, not a hand-maintained list.
  `src/schema/blocks/index.ts`: becomes a 2-line thin re-export from
  `schema-registry.ts`; schema-purity test still passes.

- ✅ **T-157b** — Renderer-side registry wire-through.
- ✅ **T-157a** — Editor-side registry wire-through.
- ✅ **T-156** — Migrate Chart block to registry (all 15 blocks migrated).
- ⚠ 0 tasks blocked this fire

## At a glance

Total tasks: 205   Done: 181 (88%)   Blocked: 0   Waiting: 2   Open: 21   Skipped: 1

## Recent commits

T-157c: schema-side registry wire-through
T-157b: renderer-side registry wire-through
T-157a: editor-side registry wire-through
T-156: migrate Chart block to self-contained registry manifest
T-155: migrate Table block to self-contained registry manifest

## CI status (origin/main)

Latest run: success (post-T-157b push)

M9a is nearly complete: T-158 (docs cross-references) is the last open task before the milestone gate.
