# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-26T16:50:11Z
**State:** RUNNING
**Running on:** GPT-5.5 (effort unknown)
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-123i** — Sanitize ProseRenderer link-mark `href` (block `javascript:`/`data:`/`vbscript:`).
- Phase 7.5 (M7 review fixes, round 5); Depends-on: T-123g (`[x]`); ~0.5h.
- HIGH security carry-over from the M7 review: consultant-authored YAML link marks currently pass `href` straight through to `<a>`.

## Progress since the previous fire

- ✅ 1 task completed this fire: T-123h
- ⚠ 0 tasks blocked this fire: none
- ⏸ 0 tasks marked waiting this fire: none
- ↩ 0 commits reverted this fire (regressions): none

## At a glance

Total tasks: 152   Done: 134 (88%)   Blocked: 0   Waiting: 2   Open: 15   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->

## Recent commits

71fe386 Plan v4: queue T-123h..T-123l (5 M7.5 follow-ups) + AGENTS.md Review playbook
7675610 T-123g: validate inserted block round trip
0abf3d8 T-123d: use real M7 fixture in integration
fb03a83 T-123f: derive IPC scope from Tauri config
4a610d4 T-123e: inline export image assets
83749eb T-123c: lock down M7 trust boundary
cc7e344 T-123b: constrain multi-section editing
24bb875 T-123a: fix editor remount cycle

## CI status (origin/main)

success (latest completed run on `main`)

Loop is running cleanly — no action needed. T-123i fires next; the
T-123i..T-123l chain closes the remaining M7.5 follow-ups before T-124 (M8)
unlocks.
