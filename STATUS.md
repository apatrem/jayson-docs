# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T20:05:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-157b** — Renderer-side registry wire-through (depends on T-156 ✓, parallel with T-157a ✓).
**T-157c** — Schema-side registry wire-through (depends on T-156 ✓, parallel with T-157a/b).

## Progress since the previous fire

- ✅ **T-157a closed this fire** — Editor-side registry wire-through.
  mapping.ts comments cleaned up (pure registry dispatch, no fallbacks).
  Editor.tsx: 15 per-block TipTap imports replaced with `loadAllBlocks()`;
  blockExtensions, ALLOWED_EDITOR_NODE_NAMES, allowedAttrsForNode all
  derived from registry (TipTap config introspection for attrs).

- ✅ **T-156** — Migrate Chart block to registry (all 15 blocks migrated).
- ✅ **T-155** — Migrate Table block to registry.
- ✅ **T-154** — Migrate KpiCards block to registry.
- ⚠ 0 tasks blocked this fire

## At a glance

Total tasks: 205   Done: 179 (87%)   Blocked: 0   Waiting: 2   Open: 23   Skipped: 1

## Recent commits

T-157a: editor-side registry wire-through
T-156: migrate Chart block to self-contained registry manifest
T-155: migrate Table block to self-contained registry manifest
T-154: migrate KpiCards block to self-contained registry manifest
T-153: close Team migration (code in T-150 scope expansion)

## CI status (origin/main)

Latest run: success (post-T-156 push)

T-157a done; T-157b (renderer) and T-157c (schema) are next eligible.
