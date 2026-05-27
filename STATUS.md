# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T10:30:23Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-126** — Router infrastructure (Routes.tsx + types) + folder-existence check (4h).
- Depends-on: T-124 (`[x]`).
- Note: T-126 and T-130 are both eligible (T-126 depends-on T-124; T-130 depends-on none). T-126 is lower-numbered — picking it first.

## Progress since the previous fire

- ✅ **T-125 closed this fire** — hardened 4 remaining fs IPC commands + rewrote 3 config commands (D-110):
  - **`src-tauri/src/ipc/fs.rs`** — added `list_directory`, `file_exists`, `ensure_directory`, `move_file`:
    - All 4 use `validate_absolute_path` (absolute + no `..`), then canonical scope check against asset roots.
    - `list_directory` skips symlinks (defense-in-depth).
    - `file_exists` returns `bool` (not error) for missing-path case; walks ancestor tree for scope check when path doesn't exist yet.
    - `ensure_directory` pre-checks scope via `find_canonical_ancestor`, creates with `create_dir_all`, post-checks canonical to catch symlink-based escapes.
    - `move_file` validates both src (must exist) and dst (parent must exist) in scope before delegating to `rename_tmp_file` (same cross-platform atomic rename as `write_yaml_file`).
    - 12 new Rust tests.
  - **`src-tauri/src/ipc/config.rs`** — rewrote per D-110:
    - `config_path` → `config.yaml` (was `config.json`).
    - `read_app_config`: reads YAML, parses via `serde_yaml::from_str::<serde_json::Value>`, returns JSON to JS (not-found → `IpcError::NotFound`; malformed YAML → `IpcError::Invalid`).
    - `write_app_config`: takes `serde_json::Value`, serializes via `serde_yaml::to_string`, atomic write-then-rename to `config.yaml`.
    - 5 new Rust tests including YAML-on-disk assertion.
  - **`src-tauri/Cargo.toml`** — added `serde_yaml = "0.9"`.
  - **`src-tauri/src/lib.rs`** — registered 4 new FS commands in invoke_handler.
  - **`tests/ipc/fs-remaining.smoke.test.ts`** (NEW) — 6 JS smoke tests for 4 new commands.
  - **`tests/ipc/config.smoke.test.ts`** (NEW) — 7 JS smoke tests for 3 config commands.
  - **`tests/ipc/fs.smoke.test.ts`** — updated "deferred M7" guard → "M8 commands confirmed registered".
  - **`tests/ipc/fs-binary.smoke.test.ts`** — updated guards to reflect M8 commands now present.
  - All gates green: cargo test 35/35, JS 523/523, tsc + lint ✓.

Scope expansion:
- `tests/ipc/fs.smoke.test.ts` — updated guard (was "deferred"; now "confirmed registered").
- `tests/ipc/fs-binary.smoke.test.ts` — two guard assertions flipped from "not present" to "present".

- ✅ **T-124 spec patched** — D-107/D-108/D-109/D-110 corrections.
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire
- ↩ 0 commits reverted this fire

## At a glance

Total tasks: 206   Done: 146 (71%)   Blocked: 0   Waiting: 2   Open: 57   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->

## Recent commits

(pending this fire's commit)
31764e7 T-124 spec patch: fix D-107/D-108 storage model, D-109 path, add D-110
039e733 T-124: M8 architecture spec (D-101..D-109) in UI_APP_SHELL.md
f7a53b9 T-123q: M7.5 round-3 audit follow-ups (M-3 / L-1 / L-3 + Windows CI)
24dcf1a T-123p: defense-in-depth + cosmetic cleanup batch

## CI status (origin/main)

latest completed run on `main`: success (pre-T-125 push)

Loop is running cleanly — T-126 is next.
