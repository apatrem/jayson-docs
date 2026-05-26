# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-26T15:30:00Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-123a** — Fix editor remount cycle (typing usability).
- Phase 7.5 (M7 review fixes); Depends-on: T-123 (`[x]`); ~1h.

## Progress since the previous fire

- 📋 Third-pass plan corrections (non-task amendment commit) addressing 2 more reviewer findings against `0d3968e`:
  - **T-123e impossible reuse of `canonical_read_target`** — the T-117 helper delegates to `validate_yaml_target_path` which enforces `.yaml`/`.yml`-only via `has_yaml_extension`. T-123e cannot use it for `.jpg`/`.png`/`.svg`/`.webp` files; the literal direction wouldn't compile. Task now requires a **new generalized helper** `canonical_scoped_read_target(path, allowed_roots, allowed_extensions)` that takes the extension allowlist as a parameter; `canonical_read_target` becomes a thin YAML-only wrapper preserving the T-117 contract. New regression test in fs.rs `#[cfg(test)] mod tests` verifies the YAML wrapper still rejects non-YAML paths after the refactor.
  - **T-123b fixture description was internally contradictory** — "extract section 1 (Executive summary)" was incompatible with "include 1 chart" because section 1 has no chart (sample-proposal.yaml's chart lives in section 3 "Approach"). Reworded as: a single-section **composite** fixture (not verbatim extract) sourcing 1 chart from §s3 and 1 prose + 1 callout + 1 KPI-cards from §s1, flattened into a single "Executive summary" section. Image + diagram still added later by T-123d alongside the harness rebuild.
- 📝 Added a comment in STATUS.md "At a glance" documenting the compound-split task-count convention so quick-script grep checks aren't confused by the difference between line count (146) and ID count (147).
- ⚠ 0 tasks blocked this fire: none
- ⏸ 0 tasks marked waiting this fire: none
- ↩ 0 commits reverted this fire: none

## At a glance

Total tasks: 147   Done: 126 (85%)   Blocked: 0   Waiting: 2   Open: 18   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->


## Recent commits

4a670c5 Plan: queue T-123a..T-123g (M7 review fixes) + update M7 acceptance gate
ccd74c2 T-123: add M7 spike integration harness
e1e820b T-122: add document error boundary and watchdog
24a240d T-121: add File menu flows
8ba3555 T-120b: wire block palette into DocumentView
ac6d248 T-120: add document view with autosave
5e7cd99 T-119: add single-document app shell
5b4e0cb T-118: implement browser handoff export IPC

## CI status (origin/main)

success (latest completed run on `main`)

Loop is running cleanly — no action needed. T-123a (1h, editor remount fix)
fires next. Phase 7.5 (M7 review fixes) is now structurally sound — no
circular fixture deps, no duplicate BLOCKERS appends, no broken file
references, and the security test uses a static assertion strategy that
actually proves what it claims to prove.
