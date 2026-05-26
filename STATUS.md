# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-26T18:37:41Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-123m** — Fix shell-open regex correctness + test mirrors runtime wrap + remove dead capability ACL.
- Phase 7.5 (M7 review fixes, round 3); Depends-on: T-123l (`[x]`); ~1.5h.
- Then T-123n (Buffer → Web Platform APIs, ~1h), then T-124 (M8) unlocks.

## Progress since the previous fire

- 📋 Two NEW BLOCKERs surfaced in M7.5 round-2 review (commits 71fe386..HEAD), both confirmed empirically:
  - **Shell-open regex is wrong in TWO directions** (T-123m, ~1.5h): under Tauri's runtime `^...$` wrap (per `tauri-plugin-shell-*/src/lib.rs:155`), the current regex (a) **blocks all legitimate `https://` URLs** because `\w` doesn't include `.`/`:`/`/`, AND (b) **permits `file://...docsystem-export/.../...html` + `smb://...` + UNC bypasses** because of `.+` greedy prefix + loose `[0-9a-f-]+` uuid that allows a single `-`. The `tests/security/shell-config.test.ts` passes because it constructs `new RegExp(pattern)` WITHOUT the wrap — a false-positive. The "non-mocked" integration test still mocks `__TAURI_INTERNALS__.invoke`. The capability `shell:allow-open` `allow:[{path:...}]` block was confirmed dead-code by reading `tauri-plugin-shell-*/src/commands.rs:313-320` — the open command never reads `command_scope`/`global_scope`. AGENTS.md §Review playbook convention #1 directly caught all of this.
  - **Node `Buffer` used in renderer code crashes Tauri webview at runtime** (T-123n, ~1h): `src/export/render-static-html.ts:154,158,176` use `Buffer.from(...)` for SVG sanitization re-encoding + base64 ↔ UTF-8 + placeholder generation. Vitest runs under Node so `Buffer` is a global → tests pass. Tauri webview is a browser context → `ReferenceError: Buffer is not defined` whenever an SVG image OR the 5MB/50MB cap fallback fires. `vite.config.ts:13-15` explicitly says "we never bundle node built-ins" and no polyfill plugin is configured.
- ➕ Queued T-123m + T-123n in `docs/TASKS.md` (Phase 7.5 budget grows ~15.5h → ~18h). M7-spike acceptance gate revised to v3: "T-123n passing". T-124 (M8 architecture) Depends-on updated to T-123n.
- 📝 `AGENTS.md §Review playbook` extended with **two new conventions** to prevent recurrence:
  - **#5 Regex/glob/pattern wrapping**: when a plugin modifies the pattern before applying (Tauri's `^...$` wrap, etc.), tests MUST mirror the modification. Cite the wrap source in a comment.
  - **#6 Node globals in renderer code**: `Buffer`/`process`/`require`/`__dirname`/`setImmediate` work in Vitest but NOT in the Tauri webview. Sweep with `grep -rE` during reviews of binary/base64/process-state code. Use Web Platform APIs (`atob`/`btoa`/`TextEncoder`/`TextDecoder`/`Uint8Array`) instead.
- ⚠ 0 tasks blocked this fire: none
- ⏸ 0 tasks marked waiting this fire: none
- ↩ 0 commits reverted this fire: none

## At a glance

Total tasks: 154   Done: 138 (89%)   Blocked: 0   Waiting: 2   Open: 13   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->

## Recent commits

84ea0e5 T-123l: polish M7 performance follow-ups
d1dadfb T-123k: close M7 test gaps
bf2947e T-123j: harden binary reads and cleanup
e33c1b0 T-123i: sanitize prose link hrefs
82c4eb7 T-123h: configure shell open scope
71fe386 Plan v4: queue T-123h..T-123l (5 M7.5 follow-ups) + AGENTS.md Review playbook
7675610 T-123g: validate inserted block round trip
0abf3d8 T-123d: use real M7 fixture in integration

## CI status (origin/main)

success (latest completed run on `main`)

Loop is running cleanly — no action needed. T-123m fires next. After
T-123m + T-123n land, M7-spike is genuinely closed (third try) and
T-124 unlocks. The AGENTS.md §Review playbook now has 6 conventions
covering the bug classes that bit us across 6 review rounds.
