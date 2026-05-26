# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-26T18:50:00Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-123m** — Fix shell-open regex correctness + test mirrors runtime wrap + remove dead capability ACL.
- Phase 7.5 (M7 review fixes, round 3); Depends-on: T-123l (`[x]`); ~1.5h.
- Then T-123n (Buffer → Web Platform APIs, ~1h), T-123o (Windows data loss, 0.5h), and T-124 (M8) unlocks.
- T-123p (defense-in-depth + cosmetic, ~1.5h) is optional — can fire in parallel with M8.

## Progress since the previous fire

- 🔍 Honest audit of carryover findings across 8 review rounds: T-123m + T-123n cover all BLOCKERs / HIGH / most MEDIUM findings, but **1 MEDIUM + 3 LOW were missing from the queue**:
  - **M-4 (round-2 audit, carryover from round-1)** — Windows delete-then-rename data loss in `fs.rs:234-241`. Real bug: any consultant whose save races an antivirus / network glitch on Windows loses their work. **Gate-blocking for M8.**
  - **L-1 (round-2)** — `cleanup_export_temp_dir` only checks root symlinks, not nested. Safe today per Rust `remove_dir_all` semantics; defense-in-depth gap.
  - **L-2 (round-2)** — SVG sanitizer is shallow (strips `<script>`/`on*=` only, misses `xlink:href`/`<foreignObject>`/SMIL/CSS `expression()`). Safe today only because embedded as `data:image/svg+xml` via `<img>`. Becomes CRITICAL if any future code path uses `<object>`/inline SVG.
  - **L-3 (round-2)** — keychain audit logging absent. Explicitly deferred to M9 prep where keychain wiring actually fires (drift entry `[drift-2026-05-26j]` added so it's not forgotten).
- ➕ Queued **2 new tasks** to close the carryover (Phase 7.5 grows ~18h → ~20h):
  - **T-123o (~0.5h, gate-blocking)** — Windows delete-then-rename fix via sibling `.bak` swap pattern + cfg-gated Windows test. M-4 closure.
  - **T-123p (~1.5h, NOT gate-blocking)** — Defense-in-depth + cosmetic batch: nested-symlink cleanup test (L-1), SVG sanitizer hardening (L-2), 3 DocumentView cosmetic cleanups (round-1 P2 carryovers). Can fire in parallel with M8.
- 📝 `BLOCKERS.md` gets `[drift-2026-05-26j]` documenting the M9-deferred keychain audit logging (L-3).
- 🔁 M7-spike acceptance gate revised v3 → v4: now "T-123o passing" (T-123p deliberately NOT gating). T-124's Depends-on stays at T-123o.
- ⚠ 0 tasks blocked this fire: none
- ⏸ 0 tasks marked waiting this fire: none
- ↩ 0 commits reverted this fire: none

## At a glance

Total tasks: 156   Done: 138 (88%)   Blocked: 0   Waiting: 2   Open: 15   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->

## Recent commits

4959ced Plan v5: queue T-123m + T-123n + AGENTS.md Review playbook #5 + #6
84ea0e5 T-123l: polish M7 performance follow-ups
d1dadfb T-123k: close M7 test gaps
bf2947e T-123j: harden binary reads and cleanup
e33c1b0 T-123i: sanitize prose link hrefs
82c4eb7 T-123h: configure shell open scope
71fe386 Plan v4: queue T-123h..T-123l (5 M7.5 follow-ups) + AGENTS.md Review playbook
7675610 T-123g: validate inserted block round trip

## CI status (origin/main)

success (latest completed run on `main`)

Loop is running cleanly — no action needed. T-123m fires first. After
T-123m + T-123n + T-123o land, M7-spike is genuinely closed (gate v4)
and T-124 unlocks. T-123p can fire in parallel with M8 or after.
L-3 (keychain audit logging) waits for M9 prep.
