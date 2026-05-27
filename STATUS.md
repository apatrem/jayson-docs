# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T18:00:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-147** — Migrate NumberedList block to registry (depends on T-146 ✓).

## Progress since the previous fire

- ✅ **T-146 closed this fire** — Migrate BulletList block to registry:
  - **`src/blocks/bullet-list/schema.ts`** (REWRITTEN) — self-contained;
    BulletListChildItemSchema, BulletListChildItem, BulletListItemSchema,
    BulletListItem, BulletListBlockSchema, BulletListBlock, emptyBulletListItem.
  - **`src/blocks/bullet-list/index.tsx`** (NEW) — fully inlined TipTap atom-node +
    BulletListNodeView + ProseMirror helpers + BulletList renderer + defineBlock manifest.
  - **Deleted:** src/schema/blocks/bullet-list.ts, src/editor/nodes/BulletListNode.tsx,
    src/renderer/blocks/BulletList.tsx, src/blocks/bullet-list/index.ts.
  - mapping.ts, Editor.tsx, DocumentRenderer.tsx, schema/blocks/index.ts updated.
  - Tests updated: bullet-list.test.ts, bullet-list.snapshot.test.ts.
  - Gates: tsc ✓, lint ✓, all tests pass.

- ✅ **T-145** — Migrate Callout block to registry.
- ✅ **T-144** — Migrate Prose block to registry.
- ✅ **T-143** — Migrate Heading block to registry.
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 205   Done: 168 (82%)   Blocked: 0   Waiting: 2   Open: 34   Skipped: 1

## Recent commits

T-146: migrate BulletList block to self-contained registry manifest
T-145: migrate Callout block to self-contained registry manifest
T-144: migrate Prose block to self-contained registry manifest
T-143: migrate Heading block to self-contained registry manifest
T-141c: bridge M8 generated-blocks loader onto runtime registry

## CI status (origin/main)

Latest run: success (post-T-145 push)

T-146 done; T-147 (NumberedList migration) is next eligible.
