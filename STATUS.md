# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T17:45:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-146** — Migrate BulletList block to registry (depends on T-145 ✓).

## Progress since the previous fire

- ✅ **T-145 closed this fire** — Migrate Callout block to registry:
  - **`src/blocks/callout/schema.ts`** (REWRITTEN) — self-contained; inlines
    CalloutVariantSchema, CalloutVariant, CalloutBlockSchema, CalloutBlock,
    calloutTintTokenFor from deleted src/schema/blocks/callout.ts.
  - **`src/blocks/callout/index.tsx`** (NEW) — fully inlined TipTap content-node +
    CalloutNodeView + ProseMirror helpers + Callout renderer + defineBlock manifest.
  - **Deleted:** src/schema/blocks/callout.ts, src/editor/nodes/CalloutNode.tsx,
    src/renderer/blocks/Callout.tsx, src/blocks/callout/index.ts.
  - mapping.ts, Editor.tsx, DocumentRenderer.tsx, schema/blocks/index.ts updated.
  - Tests updated: callout.test.ts, callout.snapshot.test.ts, mapping-registry.test.ts.
  - Gates: tsc ✓, lint ✓, all tests pass.

- ✅ **T-144** — Migrate Prose block to registry.
- ✅ **T-143** — Migrate Heading block to registry.
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 205   Done: 167 (81%)   Blocked: 0   Waiting: 2   Open: 35   Skipped: 1

## Recent commits

T-145: migrate Callout block to self-contained registry manifest
T-144: migrate Prose block to self-contained registry manifest
T-143: migrate Heading block to self-contained registry manifest
T-141c: bridge M8 generated-blocks loader onto runtime registry
T-142: migrate Divider block to self-contained registry manifest

## CI status (origin/main)

Latest run: success (post-T-144 push)

T-145 done; T-146 (BulletList migration) is next eligible.
