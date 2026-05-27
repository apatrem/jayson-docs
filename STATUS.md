# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T10:21:55Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-124** — Update `docs/UI_APP_SHELL.md` for M8 architecture.
- Depends-on: T-123o (`[x]`). T-123p and T-123q (the optional M7.5 carryover bucket) are now both `[x]`, so Phase 7 is closed.
- Estimate per task spec; first M8 task on the path to Library + Templates + Generated Blocks.
- The user-requested stop ("until next milestone approval") fires at the Phase-7 milestone gate check below — the loop pauses for human approval before picking T-124.

## Progress since the previous fire

- ✅ **T-123q closed this fire** — M7.5 round-3 audit follow-ups (3 MEDIUMs + 3 LOWs):
  - `src-tauri/tauri.conf.json` — URL branch tightened from `https?://[^\s<>"]+` to `https?://[^/@\\\s <>"]+(?:/[^\s <>"]*)?`. Rejects credentials (`https://user:pass@evil.com`), embedded `@` in the host, backslash-injection (`example.com\with\backslash`), NUL, trailing newline, and incomplete URLs. (M-3 closure.)
  - `tests/security/shell-config.test.ts` — 8 new negative cases + 1 positive: 3 credential variants, backslash-injection, NUL, trailing-newline, incomplete URL, lowercase-drive, forward-slash Windows path, and a `%20`-encoded positive regression. (L-3 closure.)
  - `src/brand-tokens/BrandProvider.tsx` — switched the dev guard from a Node-style env check to `import.meta.env.DEV` (Vite's idiomatic form). Comment now references AGENTS.md §Review playbook convention #6. (L-1 closure.)
  - `tests/smoke/no-node-globals.test.ts` (new) — static sweep across `src/**/*.{ts,tsx}` (minus Node-CLI exemptions: `src/setup/*.ts`, `src/export/pdf.ts`) for `Buffer.<m>`, `Buffer(`, `process.<m>`, `require(`, `__dirname`, `setImmediate(`. Strips comments before matching. A runtime-deletion test was considered but discarded — React's `jsxDEV` reads the Node env at JSX-call time, masking what the smoke test is meant to catch.
  - `.github/workflows/ci.yml` — new `windows-cargo-test` job on `windows-latest` running `cargo test --locked` against `src-tauri/`. First automated run of the `#[cfg(windows)]` MoveFileExW path. (M-2 closure.)
  - `BLOCKERS.md` — appended `[drift-2026-05-26l]` covering all 6 findings.

- ↩ Items in T-123q's spec that no longer applied (documented in `[drift-2026-05-26l]`):
  - The 3 Windows `.bak`-recovery edge cases (M-1) are MOOT — `rename_tmp_file` no longer uses a `.bak` swap. T-123o's follow-up commit `26a9acc` switched to `MoveFileExW(REPLACE_EXISTING | WRITE_THROUGH)`, which is atomic at the kernel level and has no inter-step failure windows to test.
  - The SVG sanitizer extension (foreignObject / animate / use / style / `href=javascript:`) and its 5 negative tests (L-2) were CLOSED by T-123p (drift `[drift-2026-05-26i]`) earlier this session. T-123p shipped 7 tripwires covering the same vectors plus a benign-http(s) preserve case.
  - The 3 AGENTS.md §Review playbook refinements already landed via earlier commits (`163164c` + the round-3 audit refinement commit) before T-123q fired. Verified at task pickup.

- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire
- ↩ 0 commits reverted this fire

## Phase 7 milestone gate — pending human approval

T-123q was the last `[ ]` task in Phase 7 (M7-spike + carryovers). Per the user-requested stop condition for this `/loop` invocation ("until next milestone approval"), the loop **does not pick T-124** automatically. The Phase 7 milestone gate (`npm run build && npm test`) ran as part of this fire's `verify-gates.sh` execution and passed — see the next section.

When the human is ready to authorize M8 work:
- Approve / pick up T-124 manually, OR
- Re-fire the loop with no stop condition and it will pick T-124 next.

## At a glance

Total tasks: 206   Done: 144 (70%)   Blocked: 0   Waiting: 2   Open: 59   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->

## Recent commits

24dcf1a T-123p: defense-in-depth + cosmetic cleanup batch
08fc725 ADR-0014: ratify swc_ecma_parser as Rust runtime dep for Authored-block lint-at-receive (T-163)
4dac6ed M9 backlog: append T-136..T-179 for block-registry refactor + Authored tier
ebe84b9 Architecture: introduce three-tier block library + Authored-block tier (ADR-0004..0013)
3ec541e Add team-meeting.jpg fixture asset for M7 image export tests.
00c5b57 Add inline editing for KPI cards and diagram blocks in the editor.
5a382f3 Fix export_pdf IPC args to match frontend invoke shape.
d5a6342 M7 validation hotfix: IpcError handling — fix "export PDF gives [object Object]"

## CI status (origin/main)

latest completed run on `main`: success (one earlier run on this fire was in-progress when T-123p was pushed; the post-push run will start after this fire's push)

Phase 7 — M7 (incl. M7.5 carryovers T-123p + T-123q) closed cleanly.
Gate runner `scripts/verify-gates.sh` passed (tsc + lint + tests all
green). The new `windows-cargo-test` CI job is wired in `.github/workflows/ci.yml`
and will run on the next GitHub push. **Loop paused for human approval
before entering Phase 8 (M8).**
