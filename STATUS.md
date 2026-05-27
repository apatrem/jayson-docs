# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T13:12:00Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-127** — First-launch folder picker (single-dialog install) + missing-folder re-pick (1h).
- Depends-on: T-125 (`[x]`), T-126 (`[x]`).
- Note: T-130 ("Create 4 standard document templates", depends-on none) is also eligible.
  Picking T-127 first as it's lower-numbered and on the critical M8 path.

## Progress since the previous fire

- ✅ **T-126 closed this fire** — Router infrastructure (Routes.tsx + types) + folder-existence check:
  - **`src/ui/router/types.ts`** (NEW) — typed `Route` discriminated union (`welcome`, `folder-picker`, `library`, `document` with multi-doc-ready `openDocs` array) + `RouteIntent` message bus.
  - **`src/ui/router/boot.ts`** (NEW) — `BootStrategy` interface + `createIpcBootStrategy()`: calls `read_app_config`, falls back to `folder-picker(first-launch)` on not-found, additionally calls `file_exists(cloudSyncRoot)` and routes to `folder-picker(missing)` when the configured folder is gone.
  - **`src/ui/router/Routes.tsx`** (NEW) — full route table with `useReducer`-based state. Handles welcome, folder-picker, library, document routes. Document shell has `AppErrorBoundary` + `BrandProvider` + `withRenderWatchdog`. When `initialDocContent` is provided, route is seeded synchronously (no async flash for tests).
  - **`src/schema/app-config.ts`** (NEW) — `M8PartialConfigSchema` for the subset of config the GUI writes.
  - **`src/App.tsx`** — refactored from M7-spike single-document shell to thin wrapper over `Routes`. Resolves boot strategy from props; falls back to `createIpcBootStrategy()` when neither `bootStrategy` nor `initialDocument` is provided.
  - **`tests/integration/m7-spike-harness.ts`** — adds `welcomeBootStrategy` + `bootStrategy` option so harness tests don't hit real IPC.
  - **`tests/ui/router/Routes.test.tsx`** (NEW) — 9 tests covering boot transitions, folder-picker `reason` copy variants, library stub, multi-doc route shape (D-105), and open-from-welcome flow.
  - **`tests/ui/App.test.tsx`** — updated to use new API (`bootStrategy`, `fileActions`) instead of deprecated `onOpenDocument`; updated YAML fixture to current schema.
  - **`tests/ui/menu/FileMenu.test.tsx`** — added `bootStrategy` to the open-from-welcome test to avoid IPC without mock.
  - All gates green: tsc ✓, lint ✓, 532/532 tests pass.

Scope expansion:
- `tests/ui/App.test.tsx` — updated (was testing pre-router API; now uses bootStrategy + fileActions).
- `tests/ui/menu/FileMenu.test.tsx` — minimal boot-strategy addition to one test.

- ✅ **T-125 closed previous fire** — FS hardening + D-110 config rewrite.
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 206   Done: 147 (71%)   Blocked: 0   Waiting: 2   Open: 56   Skipped: 1

## Recent commits

(pending this fire's commit)
e501ed9 T-125: harden 4 remaining fs + 3 config IPC commands
31764e7 T-124 spec patch: fix D-107/D-108 storage model, D-109 path, add D-110
039e733 T-124: M8 architecture spec (D-101..D-109) in UI_APP_SHELL.md
f7a53b9 T-123q: M7.5 round-3 audit follow-ups (M-3 / L-1 / L-3 + Windows CI)

## CI status (origin/main)

latest completed run on `main`: success (pre-T-126 push)

Loop is running cleanly — T-127 is next.
