# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-28T00:30:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Progress since the previous fire

- ✅ **T-167 closed this fire** — Soft archive IPC commands + capability ACL update.
  - `src-tauri/src/ipc/fs.rs` (SCOPE EXPAND) — three new Rust IPC handlers: `archive_authored_block`, `restore_authored_block`, `permanently_delete_authored_block`; shared helpers `move_authored_block_to_dir` + `permanently_delete_authored_block_at_path`; 10 regression tests covering happy path, missing sidecar, scope rejection, path traversal, wrong extension.
  - `src-tauri/src/lib.rs` (UPDATED) — registered the three new commands in `invoke_handler!`.
  - `src/ipc/authored-block.ts` (EXTENDED) — TypeScript clients `archiveAuthoredBlock`, `restoreAuthoredBlock`, `permanentlyDeleteAuthoredBlock`.
  - `docs/TAURI_IPC.md` (UPDATED) — new §7 "Authored-block lifecycle commands" with signatures, scope note (existing broad patterns already cover `generated-blocks/archived/`), and capability note.
  - **Capability ACL review:** custom `#[tauri::command]` handlers need no extra capability entries — `core:default` (already in `main-window.json`) covers them. `assetProtocol.scope` patterns `$HOME/Dropbox/**` etc. already cover `generated-blocks/archived/` as a subdirectory of `cloudSyncRoot`.

- ✅ T-165 — Quarantine state + UI (prior fire).
- ✅ T-164 — drag-onto-window install + Import block menu item (prior fire).
- ✅ T-163 — Rust authored-block lint sidecar (prior fire).

## At a glance

Total tasks: 205   Done: 190 (93%)   Blocked: 0   Waiting: 2   Open: 12   Skipped: 1

## Next eligible tasks

**T-168** — `generated-blocks/archived/` folder + `RemovedBlockPlaceholder` (depends T-167 ✓, T-141c ✓).
**T-179** — Update `docs/BLOCK_IMPLEMENTATION_GUIDE.md` for `defineAuthoredBlock` (depends T-159 ✓).

(T-166 still blocked — depends T-175 [ ].)

## Recent commits

T-167: soft archive IPC commands + capability ACL update
T-165: quarantine state + UI
T-164: drag-onto-window install + Import block menu item
T-163: Rust authored-block lint sidecar + TypeScript lint + agreement fixtures
T-162: identity scheme validator

## CI status (origin/main)

Latest run: success (post-T-165 push)

Loop is running cleanly — no action needed.
