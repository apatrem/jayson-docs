# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T10:10:08Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-123q** — M7.5 round-3 audit follow-ups (3 MEDIUMs + 3 LOWs batched, NOT gate-blocking).
- Depends-on: T-123l (`[x]`). Est. ~2h.
- After T-123q closes the M7.5 carryover tail (with T-123p `[x]` this fire), the loop pivots to M8 (T-124).
- Reminder: T-123q is NOT gate-blocking for M8 firing per the M7-spike acceptance gate v4, but IS gate-blocking for v1.0 external release (Phase 11 → T-108/T-109).

## Progress since the previous fire

The previous STATUS.md was written just after the M7-spike gate closed at v4 (T-123o `[x]`). Since then, several commits landed outside the loop:

- ✅ T-123p **closed this fire** — defense-in-depth + cosmetic cleanup batch (was open at last STATUS.md):
  - `src-tauri/src/ipc/pdf.rs` — `cleanup_export_temp_dir_at` now prunes top-level symlink children by name before `remove_dir_all`. Adds `cleanup_export_temp_dir_unlinks_nested_symlink_without_touching_target` (cfg(unix)) — proves the target dir survives cleanup.
  - `src/export/render-static-html.ts` — `sanitizeSvgForImage` extended from {`<script>`, `on*=`} to also strip `<style>`, `<foreignObject>`, `<animate>`/`<animateMotion>`/`<animateTransform>`/`<set>`, and `(xlink:)?href="javascript:…"` attributes. 7 new tripwire tests cover each vector + a benign-http(s) preserve case.
  - `src/export/render-static-html.ts` — replaced `error.message.includes("file exceeds 5MB export limit")` with `kind === "invalid" && SIZE_CAP_MESSAGE_PATTERN.test(...)`. Pattern is a top-of-file const with a comment pointing at `src-tauri/src/ipc/fs.rs:51` as the contract anchor.
  - `src/ui/views/DocumentView.tsx` — dropped the dead `currentDoc.current ?? doc` fallback; added a comment explaining the ref is always non-null in `onUpdate`. The third cosmetic item (`editorContent useMemo([doc])`) is no longer present in the code (editor seed is held in `useState`, not `useMemo`) — bullet is a no-op.
  - `docs/UI_APP_SHELL.md` — new §"SVG sanitization contract" subsection documenting the "safe ONLY for `<img src=data:>` consumption" contract + the cross-boundary constraint with `read_binary_file`.
  - `BLOCKERS.md` — appended `[drift-2026-05-26i]`.

- ⏪ Drift since last STATUS.md (commits landed outside the loop driver):
  - `307ca7f T-123p: fix document watchdog budget` — note the commit subject borrowed the T-123p ID but the diff (`src/App.tsx`, `tests/ui/AppErrorBoundary.test.tsx`) is unrelated to T-123p's Outputs. The marker was never flipped to [x] there because the work didn't match the task spec; T-123p's real Outputs closed this fire.
  - `26a9acc T-123o: use Windows replace move for saves` — follow-up to T-123o, marker already [x].
  - `d5a6342 M7 validation hotfix: IpcError handling — fix "export PDF gives [object Object]"` and `5a382f3 Fix export_pdf IPC args to match frontend invoke shape` — M7-spike validation patches (this is the work that introduced `src/ipc/errors.ts` + the AGENTS.md review-playbook convention #8).
  - `00c5b57 Add inline editing for KPI cards and diagram blocks in the editor` — M7-spike polish.
  - `3ec541e Add team-meeting.jpg fixture asset for M7 image export tests` — M7-spike fixture.
  - `ebe84b9 Architecture: introduce three-tier block library + Authored-block tier (ADR-0004..0013)` — substantial architecture intro (11 new ADRs).
  - `4dac6ed M9 backlog: append T-136..T-179 for block-registry refactor + Authored tier` — 44 new task IDs queued (M9a + M9b).
  - `08fc725 ADR-0014: ratify swc_ecma_parser as Rust runtime dep for Authored-block lint-at-receive (T-163)` — Rust dep decision for the Authored-block lint pipeline.

- ⚠ 0 tasks blocked this fire: none
- ⏸ 0 tasks marked waiting this fire: none
- ↩ 0 commits reverted this fire: none

## At a glance

Total tasks: 206   Done: 143 (69%)   Blocked: 0   Waiting: 2   Open: 60   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->

## Recent commits

08fc725 ADR-0014: ratify swc_ecma_parser as Rust runtime dep for Authored-block lint-at-receive (T-163)
4dac6ed M9 backlog: append T-136..T-179 for block-registry refactor + Authored tier
ebe84b9 Architecture: introduce three-tier block library + Authored-block tier (ADR-0004..0013)
3ec541e Add team-meeting.jpg fixture asset for M7 image export tests.
00c5b57 Add inline editing for KPI cards and diagram blocks in the editor.
5a382f3 Fix export_pdf IPC args to match frontend invoke shape.
d5a6342 M7 validation hotfix: IpcError handling — fix "export PDF gives [object Object]"
26a9acc T-123o: use Windows replace move for saves

## CI status (origin/main)

latest completed run on `main`: success (one CI run currently `in_progress` as of this fire)

Loop is running cleanly — no action needed. T-123p closes the M7.5 LOW
carryover bucket. T-123q (round-3 MEDIUMs/LOWs) is the next pick and
still NOT gate-blocking for M8. Once T-123q lands, M7.5 milestone gate
fires and the loop pivots to T-124 (M8). The user-requested stop
condition ("until next milestone approval") will be honored at the
M7.5 milestone gate check.
