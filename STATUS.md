# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T18:20:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-149** — Migrate Diagram block to registry (depends on T-148 ✓).

## Progress since the previous fire

- ✅ **T-148 closed this fire** — Migrate Image block to registry:
  - **`src/blocks/image/schema.ts`** (REWRITTEN) — self-contained.
  - **`src/blocks/image/index.tsx`** (NEW) — fully inlined TipTap atom-node +
    ImageNodeView + ProseMirror helpers + Image renderer + defineBlock manifest.
  - **Deleted:** src/schema/blocks/image.ts, src/editor/nodes/ImageNode.tsx,
    src/renderer/blocks/Image.tsx, src/blocks/image/index.ts.
  - mapping.ts, Editor.tsx, DocumentRenderer.tsx, schema/blocks/index.ts updated.
  - Tests updated: image.test.ts, image.snapshot.test.ts.
  - Gates: tsc ✓, lint ✓, all tests pass.

- ✅ **T-147** — Migrate NumberedList block to registry.
- ✅ **T-146** — Migrate BulletList block to registry.
- ✅ **T-145** — Migrate Callout block to registry.
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 205   Done: 170 (83%)   Blocked: 0   Waiting: 2   Open: 32   Skipped: 1

## Recent commits

T-148: migrate Image block to self-contained registry manifest
T-147: migrate NumberedList block to self-contained registry manifest
T-146: migrate BulletList block to self-contained registry manifest
T-145: migrate Callout block to self-contained registry manifest
T-144: migrate Prose block to self-contained registry manifest

## CI status (origin/main)

Latest run: success (post-T-147 push)

T-148 done; T-149 (Diagram migration) is next eligible.
