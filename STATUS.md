# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-26T16:42:35Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-123h** — Configure shell plugin `open` regex + non-mocked smoke test.
- Phase 7.5 (M7 review fixes, round 5); Depends-on: T-123g (`[x]`); ~1h.
- **NEW BLOCKER** discovered after T-123g landed: Tauri's shell plugin requires BOTH a capability ACL AND a `plugins.shell.open` regex in `tauri.conf.json`. Only the capability is configured; at runtime, `tauri-plugin-shell` rejects with a "purposefully impossible regex" error. Source citation: `~/.cargo/registry/src/.../tauri-plugin-shell-2.3.5/src/scope.rs::OpenScope::open`. The integration test passes because `openPath` is mocked in `App.tsx:156`.

## Progress since the previous fire

- 📋 Fifth-round multi-axis review surfaced 1 new runtime BLOCKER + 1 HIGH security carry-over + a batch of MEDIUM/LOW/test/perf follow-ups. Queued **5 new tasks** T-123h..T-123l (Phase 7.5 v2, ~6h total) to close them BEFORE M8 fires:
  - **T-123h (1h)** — NEW BLOCKER: shell plugin `open` regex unconfigured → runtime export PDF broken. Adds the regex + a static config-shape test + a non-mocked integration sub-test + drift entry `[drift-2026-05-26f]`. Three review agents missed this because all stopped at the capability ACL; the lesson is now codified in `AGENTS.md §Review playbook`.
  - **T-123i (0.5h)** — HIGH carry-over from M7 security audit: ProseRenderer `javascript:`/`data:`/`vbscript:` href XSS. 5-line sanitizer + 14-case sanitization test.
  - **T-123j (1.5h)** — MEDIUM + LOW security: read_binary_file post-canonicalize extension recheck (symlink rename pivot), delete 4 dead `pub async fn` bodies + legacy `validate_path`, SVG safety comment, cleanup_export_temp_dir symlink check.
  - **T-123k (2h)** — Test gap closure: `userEvent.type` real-typing test, 5MB/50MB cap fallback tests, SVG XSS export test, drift-detector addition-catching, schema negative case, delete tautological mock test.
  - **T-123l (1h)** — Perf + cleanup: `read_binary_file` returns base64 String (drops IPC bandwidth ~3×), watchdog budget from 10s → 1s with documented justification, code comments for `ce29a4c`/`59353c2` rationale.
- 📝 `AGENTS.md §Review playbook` (NEW section, ~25 lines) codifies four review-process learnings: (1) verify against `~/.cargo/registry/src/*tauri-plugin-*` source when reviewing Tauri IPC/plugin changes; (2) verify against `node_modules/@tauri-apps/plugin-*/dist-js/*.d.ts` JS-side docs; (3) tests that mock the IPC bridge cannot prove plugin-level scope works; (4) synthetic fixtures hide bugs. The first lesson is the M7.5 5th-round shell-plugin finding directly.
- 📝 Revised M7-spike acceptance gate from "T-123g passing" → "T-123l passing" (v2). T-124 (M8 architecture) Depends-on updated from `T-123g` → `T-123l`.
- 📊 Summary table: Phase 7.5 budget grows from ~9.5h → ~15.5h; total project est. from ~545h → ~551h.
- ⚠ 0 tasks blocked this fire: none
- ⏸ 0 tasks marked waiting this fire: none
- ↩ 0 commits reverted this fire: none

## At a glance

Total tasks: 152   Done: 133 (87%)   Blocked: 0   Waiting: 2   Open: 16   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->

## Recent commits

7675610 T-123g: validate inserted block round trip
0abf3d8 T-123d: use real M7 fixture in integration
fb03a83 T-123f: derive IPC scope from Tauri config
4a610d4 T-123e: inline export image assets
83749eb T-123c: lock down M7 trust boundary
cc7e344 T-123b: constrain multi-section editing
24bb875 T-123a: fix editor remount cycle
59353c2 Relax render watchdog budget in M7 integration harness

## CI status (origin/main)

success (latest completed run on `main`)

Loop is running cleanly — no action needed. T-123h fires next; the
T-123h..T-123l chain (~6h total) closes M7.5 for real before T-124 (M8)
unlocks.
