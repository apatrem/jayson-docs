# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T13:20:00Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-128** — Library view: scaffold + folder scan + empty-state "Use Sample" (4h).
- Depends-on: T-125 (`[x]`), T-126 (`[x]`), T-127 (`[x]`).

## Progress since the previous fire

- ✅ **T-127 closed this fire** — FolderPickerScreen for first-launch + missing-folder re-pick:
  - **`src/ui/install/FolderPickerScreen.tsx`** (NEW) — reason-aware heading, "Choose Folder…" button,
    injectable `deps` (selectFolder + writeAppConfig) for testability. On pick: calls `write_app_config`
    IPC with `{ paths: { cloudSyncRoot: path } }`, then dispatches `back-to-library`. On cancel: no-op.
  - **`src/ui/router/Routes.tsx`** — replaced folder-picker placeholder with `<FolderPickerScreen>`.
  - **`tests/ui/install/FolderPickerScreen.test.tsx`** (NEW) — 5 tests: first-launch render,
    missing-folder render, pick → write → dispatch (both reasons), cancel stays on screen.
  - All gates green: tsc ✓, lint ✓, 537/537 tests pass.

- ✅ **T-126 closed previous fire** — router infrastructure (Routes.tsx + types + boot strategy).
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 206   Done: 148 (72%)   Blocked: 0   Waiting: 2   Open: 55   Skipped: 1

## Recent commits

(pending this fire's commit)
T-126: router infrastructure (Routes.tsx + types) + folder-existence check
e501ed9 T-125: harden 4 remaining fs + 3 config IPC commands
31764e7 T-124 spec patch: fix D-107/D-108 storage model, D-109 path, add D-110

## CI status (origin/main)

latest completed run on `main`: success (pre-T-127 push)

Loop is running cleanly — T-128 is next.
