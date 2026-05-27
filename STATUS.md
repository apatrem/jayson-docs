# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-28T00:45:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Progress since the previous fire

- ✅ **T-168 closed this fire** — `generated-blocks/archived/` folder + `RemovedBlockPlaceholder`.
  - `generated-blocks/archived/.gitkeep` (NEW) — directory stub tracked in git.
  - `src/editor/BlockPalette.tsx` (SCOPE EXPAND) — `BlockPaletteItem.folder?: "active" | "archived"` field for T-169 palette filter.
  - `src/blocks/runtime-registry.ts` (UPDATED) — `loadBrandBlockPaletteItems` tags active Authored items with `folder: "active"`; new `loadAuthoredBlockEntries(cloudSyncRoot)` scans both `active/` and `archived/`, returns all Authored items tagged with folder origin (for T-169 management view).
  - `src/blocks/RemovedBlockPlaceholder.tsx` (NEW) — renders ⚠ banner with slug title + sender for permanently-deleted block types.
  - `src/renderer/DocumentRenderer.tsx` (SCOPE EXPAND) — falls back to `RemovedBlockPlaceholder` instead of throwing when an Authored block type is not in the renderer registry.
  - `tests/blocks/runtime-registry.test.ts` (NEW) — 11 tests for `loadBrandBlockPaletteItems` and `loadAuthoredBlockEntries` (folder tagging, sidecar filtering, dot-file skipping, sort order, trailing-slash handling).
  - `tests/blocks/RemovedBlockPlaceholder.test.tsx` (NEW) — 6 tests: note role, slug title, sender, non-authored type, no-sender fallback, hint text.

- ✅ T-167 — Soft archive IPC commands (this fire).
- ✅ T-165 — Quarantine state + UI (prior fire).
- ✅ T-164 — drag-onto-window install + Import block menu item (prior fire).

## At a glance

Total tasks: 205   Done: 191 (93%)   Blocked: 0   Waiting: 2   Open: 11   Skipped: 1

## Next eligible tasks

**T-169** — BlockPalette filter (active-only) + Authored-block manager view (depends T-168 ✓).
**T-170** — Replacement logic same-sender v2 replaces v1 (depends T-168 ✓).
**T-179** — Update `docs/BLOCK_IMPLEMENTATION_GUIDE.md` for `defineAuthoredBlock` (depends T-159 ✓).

(T-166 still blocked — depends T-175 [ ].)

## Recent commits

T-168: generated-blocks/archived/ folder + RemovedBlockPlaceholder
T-167: soft archive IPC commands + capability ACL update
T-165: quarantine state + UI
T-164: drag-onto-window install + Import block menu item
T-163: Rust authored-block lint sidecar + TypeScript lint + agreement fixtures

## CI status (origin/main)

Latest run: success (post-T-167 push)

Loop is running cleanly — no action needed.
