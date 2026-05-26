# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-26T18:19:41Z
**State:** RUNNING
**Running on:** GPT-5.5 (effort unknown)
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-124** — Update UI_APP_SHELL.md for M8 architecture.
- Phase 8 (M8); Depends-on: T-123l (`[x]`); ~2h.
- Updates the app-shell architecture notes before M8 implementation starts.

## Progress since the previous fire

- ✅ 1 task completed this fire: T-123l
- ⚠ 0 tasks blocked this fire: none
- ⏸ 0 tasks marked waiting this fire: none
- ↩ 0 commits reverted this fire (regressions): none

## At a glance

Total tasks: 152   Done: 138 (91%)   Blocked: 0   Waiting: 2   Open: 11   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->

## Recent commits

d1dadfb T-123k: close M7 test gaps
bf2947e T-123j: harden binary reads and cleanup
e33c1b0 T-123i: sanitize prose link hrefs
82c4eb7 T-123h: configure shell open scope
71fe386 Plan v4: queue T-123h..T-123l (5 M7.5 follow-ups) + AGENTS.md Review playbook
7675610 T-123g: validate inserted block round trip
0abf3d8 T-123d: use real M7 fixture in integration
fb03a83 T-123f: derive IPC scope from Tauri config

## CI status (origin/main)

success (latest completed run on `main`)

Loop is running cleanly — no action needed. T-123l closes the remaining
M7.5 follow-up; the next eligible task is T-124 (M8).
