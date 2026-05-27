# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T17:30:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-145** — Migrate Callout block to registry (depends on T-144 ✓).

## Progress since the previous fire

- ✅ **T-144 closed this fire** — Migrate Prose block to registry:
  - **`src/blocks/prose/schema.ts`** (REWRITTEN) — self-contained; inlines
    ProseAlignSchema, ProseAlign, ProseBlockSchema, ProseBlock.
  - **`src/blocks/prose/index.tsx`** (NEW) — fully inlined TipTap node (content
    node, not atom) + ProseMirror helpers + Prose renderer + defineBlock manifest.
  - **Deleted:** src/schema/blocks/prose.ts, src/editor/nodes/ProseNode.tsx,
    src/renderer/blocks/Prose.tsx.
  - mapping.ts, Editor.tsx, DocumentRenderer.tsx, schema/blocks/index.ts updated.
  - Tests updated: prose.test.ts, prose.snapshot.test.ts, mapping-registry.test.ts.
  - Gates: tsc ✓, lint ✓, all tests pass.

- ✅ **T-143** — Migrate Heading block to registry.
- ✅ **T-141c** — Bridge M8 generated-blocks loader onto runtime registry.
- ✅ **T-142** — Migrate Divider block to registry.
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 205   Done: 166 (81%)   Blocked: 0   Waiting: 2   Open: 36   Skipped: 1

## Recent commits

T-144: migrate Prose block to self-contained registry manifest
T-143: migrate Heading block to self-contained registry manifest
T-141c: bridge M8 generated-blocks loader onto runtime registry
T-142: migrate Divider block to self-contained registry manifest
T-141b: make mapping.ts registry-aware (hybrid dispatch)

## CI status (origin/main)

Latest run: success (post-T-143 push)

T-144 done; T-145 (Callout migration) is next eligible.
