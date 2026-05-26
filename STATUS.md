# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-26T16:57:43Z
**State:** RUNNING
**Running on:** GPT-5.5 (effort unknown)
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-123k** — Close the test gaps surfaced by M7.5 review.
- Phase 7.5 (M7 review fixes, round 5); Depends-on: T-123g (`[x]`); ~2h.
- Adds the remaining review-driven regression tests and removes one tautological IPC mock check.

## Progress since the previous fire

- ✅ 1 task completed this fire: T-123j
- ⚠ 0 tasks blocked this fire: none
- ⏸ 0 tasks marked waiting this fire: none
- ↩ 0 commits reverted this fire (regressions): none

## At a glance

Total tasks: 152   Done: 136 (89%)   Blocked: 0   Waiting: 2   Open: 13   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->

## Recent commits

e33c1b0 T-123i: sanitize prose link hrefs
82c4eb7 T-123h: configure shell open scope
71fe386 Plan v4: queue T-123h..T-123l (5 M7.5 follow-ups) + AGENTS.md Review playbook
7675610 T-123g: validate inserted block round trip
0abf3d8 T-123d: use real M7 fixture in integration
fb03a83 T-123f: derive IPC scope from Tauri config
4a610d4 T-123e: inline export image assets
83749eb T-123c: lock down M7 trust boundary

## CI status (origin/main)

in_progress (latest run on `main` for e33c1b0)

Loop is running cleanly — no action needed. T-123k fires next; the
T-123k..T-123l chain closes the remaining M7.5 follow-ups before T-124 (M8)
unlocks.
