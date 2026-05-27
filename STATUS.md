# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T18:30:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-150** — Migrate Timeline block to registry (depends on T-149 ✓).

## Progress since the previous fire

- ✅ **T-149 closed this fire** — Migrate Diagram block to registry:
  - **`src/blocks/diagram/schema.ts`** (REWRITTEN) — self-contained.
  - **`src/blocks/diagram/index.tsx`** (NEW) — fully inlined TipTap atom-node +
    DiagramNodeView (with editor form + live preview) + ProseMirror helpers +
    Diagram renderer + defineBlock manifest.
  - **Deleted:** src/schema/blocks/diagram.ts, src/editor/nodes/DiagramNode.tsx,
    src/renderer/blocks/Diagram.tsx, src/blocks/diagram/index.ts.
  - mapping.ts, Editor.tsx, DocumentRenderer.tsx, schema/blocks/index.ts updated.
  - Tests updated: diagram.test.ts, diagram.snapshot.test.ts.
  - Gates: tsc ✓, lint ✓, all tests pass.

- ✅ **T-148** — Migrate Image block to registry.
- ✅ **T-147** — Migrate NumberedList block to registry.
- ✅ **T-146** — Migrate BulletList block to registry.
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 205   Done: 171 (83%)   Blocked: 0   Waiting: 2   Open: 31   Skipped: 1

## Recent commits

T-149: migrate Diagram block to self-contained registry manifest
T-148: migrate Image block to self-contained registry manifest
T-147: migrate NumberedList block to self-contained registry manifest
T-146: migrate BulletList block to self-contained registry manifest
T-145: migrate Callout block to self-contained registry manifest

## CI status (origin/main)

Latest run: success (post-T-148 push)

T-149 done; T-150 (Timeline migration) is next eligible.
