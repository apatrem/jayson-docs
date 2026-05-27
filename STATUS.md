# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T17:15:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-144** — Migrate Prose block to registry (depends on T-143 ✓).

## Progress since the previous fire

- ✅ **T-143 closed this fire** — Migrate Heading block to registry:
  - **`src/blocks/heading/schema.ts`** (REWRITTEN) — self-contained; inlines
    HeadingLevelSchema, HeadingLevel, HeadingBlockSchema, HeadingBlock,
    headingScaleKey from deleted src/schema/blocks/heading.ts.
  - **`src/blocks/heading/index.tsx`** (NEW — replaces legacy index.ts) — fully
    inlined TipTap node + editor view + ProseMirror helpers + Heading renderer
    + defineBlock manifest. All symbols exported by name for backward-compat.
  - **Deleted:** src/schema/blocks/heading.ts, src/editor/nodes/HeadingNode.tsx,
    src/renderer/blocks/Heading.tsx.
  - **`src/editor/mapping.ts`** — removed heading import and both switch arms.
  - **`src/schema/blocks/index.ts`** — updated HeadingBlockSchema import.
  - **`src/editor/Editor.tsx`** — updated HeadingTipTapNode import.
  - **`src/renderer/DocumentRenderer.tsx`** — updated Heading import.
  - Tests updated: heading.test.ts, heading.snapshot.test.ts, mapping-registry.test.ts.
  - Gates: tsc ✓, lint ✓, all tests pass.

- ✅ **T-141c** — Bridge M8 generated-blocks loader onto runtime registry.
- ✅ **T-142** — Migrate Divider block to registry.
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 205   Done: 165 (80%)   Blocked: 0   Waiting: 2   Open: 37   Skipped: 1

## Recent commits

T-143: migrate Heading block to self-contained registry manifest
T-141c: bridge M8 generated-blocks loader onto runtime registry
T-142: migrate Divider block to self-contained registry manifest
T-141b: make mapping.ts registry-aware (hybrid dispatch)
T-141a: professional-consulting brand theme + structural HTML snapshot baselines

## CI status (origin/main)

Latest run: success (post-T-141c push)

T-143 done; T-144 (Prose migration) is next eligible.
