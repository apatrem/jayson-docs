# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-28T01:00:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Progress since the previous fire

- ✅ **T-169 closed this fire** — BlockPalette filter (active-only) + Authored-block manager view.
  - `src/editor/BlockPalette.tsx` (SCOPE EXPAND) — defense-in-depth filter: items with `folder: "archived"` are excluded even if a caller passes a mixed list to `generatedBlocks`.
  - `src/ui/library/AuthoredBlockManager.tsx` (NEW) — collapsible panel listing all Authored blocks (active + archived) with Archive / Restore / Permanently-delete per-block actions. Permanent-delete shows `window.confirm` with an open-doc count warning (injected via `openDocBlockTypes` prop; defaults to 0 in library context per ADR-0010).
  - `src/ui/library/LibraryView.tsx` (UPDATED) — wires `AuthoredBlockManager` into both "empty" and "loaded" library states; extended `LibraryViewDeps` with `authoredBlockManagerDeps?`; default deps use the T-167 IPC clients + `loadAuthoredBlockEntries`.
  - `tests/ui/library/AuthoredBlockManager.test.tsx` (NEW) — 11 tests: empty state, active block rendering, Archive action + error, archived block rendering, Restore action, permanent-delete confirm + cancel + open-doc count warning, collapse/expand.

- ✅ T-168 — archived/ folder + RemovedBlockPlaceholder (this fire).
- ✅ T-167 — Soft archive IPC commands (this fire).
- ✅ T-165 — Quarantine state + UI (prior fire).

## At a glance

Total tasks: 205   Done: 192 (94%)   Blocked: 0   Waiting: 2   Open: 10   Skipped: 1

## Next eligible tasks

**T-170** — Replacement logic same-sender v2 replaces v1 (depends T-168 ✓).
**T-179** — Update `docs/BLOCK_IMPLEMENTATION_GUIDE.md` for `defineAuthoredBlock` (depends T-159 ✓).

(T-166 still blocked — depends T-175 [ ].)

## Recent commits

T-169: BlockPalette filter + Authored-block manager view
T-168: generated-blocks/archived/ folder + RemovedBlockPlaceholder
T-167: soft archive IPC commands + capability ACL update
T-165: quarantine state + UI
T-164: drag-onto-window install + Import block menu item

## CI status (origin/main)

Latest run: success (post-T-168 push)

Loop is running cleanly — no action needed.
