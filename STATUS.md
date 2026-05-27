# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-28T02:30:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Progress since the previous fire

- ✅ **T-171 closed this fire** — In-document "Create new Authored block" trigger.
  - `src/editor/BlockPalette.tsx` (UPDATED) — added `onCreateAuthoredBlock?: () => void` prop; renders a "✦ Create new Authored block" button at the bottom of the palette, enabled only when the callback is provided.
  - `src/ui/views/DocumentView.tsx` (UPDATED) — added `onCreateAuthoredBlock?: (doc: DocumentModel) => void` prop; wires it through to `BlockPalette.onCreateAuthoredBlock` capturing `currentDoc.current` at click time so the generation pipeline (T-172/T-173) receives the full live document context.
  - `tests/editor/BlockPalette.test.tsx` (NEW) — 6 tests: Create button always rendered, disabled without prop, enabled with prop, fires callback, appears below block list, archived blocks still hidden.
  - `tests/ui/views/DocumentView.test.tsx` (UPDATED) — new test: clicking Create threads the current DocModel to `onCreateAuthoredBlock`.

- ✅ T-170 closed last fire — Replacement logic: same-sender v2 replaces v1 in-place (ADR-0009).
- ✅ T-169 — BlockPalette filter + Authored-block manager view.

## At a glance

Total tasks: 205   Done: 194 (95%)   Blocked: 0   Waiting: 5   Open: 3   Skipped: 1

## Next eligible tasks

**T-175** — LLM provisioning — authored-block-generation frontier-key category (depends T-135 ✓).
**T-179** — Update `docs/BLOCK_IMPLEMENTATION_GUIDE.md` for `defineAuthoredBlock` (depends T-159 ✓).

(T-172 depends T-171 ✓ — also now eligible.)

(T-166 blocked on T-175 [ ]. T-173–T-174, T-176–T-177 blocked on earlier tasks.)

## Recent commits

T-171: in-document "Create new Authored block" trigger + DocModel context threading
T-170: replacement logic — same-sender v2 replaces v1 in-place (ADR-0009)
T-169: BlockPalette filter + Authored-block manager view
T-168: generated-blocks/archived/ folder + RemovedBlockPlaceholder
T-167: soft archive IPC commands + capability ACL update

## CI status (origin/main)

Latest run: success (post-T-170 push)

Loop is running cleanly — no action needed.
