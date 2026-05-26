# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-26T15:30:27Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-123b** — Constrain multi-section documents in M7-spike (+ create shared single-section fixture).
- Phase 7.5 (M7 review fixes); Depends-on: T-123 (`[x]`); ~1h.

## Progress since the previous fire

- ✅ 1 task completed this fire: T-123a
- T-123a fixed the editor remount cycle:
  - Removed the content-derived key from the real TipTap editor.
  - Re-seeds the editor surface only when the active file path changes.
  - Tracks the current edited DocModel in a ref while still updating the preview pane and autosave.
  - Added a real-editor regression test that proves the editor DOM node survives an edit.
- ⚠ 0 tasks blocked this fire: none
- ⏸ 0 tasks marked waiting this fire: none
- ↩ 0 commits reverted this fire: none

## At a glance

Total tasks: 147   Done: 127 (86%)   Blocked: 0   Waiting: 2   Open: 17   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->


## Recent commits

59353c2 Relax render watchdog budget in M7 integration harness
ce29a4c Fix save-error integration test when render watchdog alert is present
5d388c6 Plan corrections v3: T-123e scoped read helper + T-123b fixture wording
0d3968e Plan corrections v2: T-123a keying strategy + T-123b App.tsx wiring + STATUS timestamp
95ff8d0 Plan corrections: fix 4 review findings in T-123a..T-123g definitions
4a670c5 Plan: queue T-123a..T-123g (M7 review fixes) + update M7 acceptance gate
ccd74c2 T-123: add M7 spike integration harness
e1e820b T-122: add document error boundary and watchdog

## CI status (origin/main)

success (latest completed run on `main`)

Loop is running cleanly — no action needed. T-123b (multi-section
constraint + single-section fixture) fires next.
