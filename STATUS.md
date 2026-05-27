# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T10:30:23Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-125** — Harden remaining fs + config IPC commands (4h).
- Depends-on: T-124 (`[x]`).
- Implements the IPC layer that T-126's `createIpcBootStrategy` reads from (`read_app_config`, `file_exists`) and the library scaffold (`list_directory`).
- User re-fired loop — T-124 spec patched (D-107, D-109, D-110 corrections applied); T-125 is now live.

## Progress since the previous fire

- ✅ **T-124 spec patched (post-review)** — 3 critical corrections applied to `docs/UI_APP_SHELL.md`:
  - **D-107 corrected:** "Use Sample" writes a folder (`<cloudSyncRoot>/Sample Proposal/proposal.yaml`) not a flat file — per D-19 (each doc is a folder). `ensure_directory` call added before `write_yaml_file`.
  - **D-108 corrected:** Template clone writes `<cloudSyncRoot>/<sanitizedName>/proposal.yaml` (folder-per-doc) not `<cloudSyncRoot>/<sanitizedName>.yaml`.
  - **D-109 corrected:** `loadGeneratedBlocks(cloudSyncRoot)` — not `loadGeneratedBlocks(cloudSyncRoot + "/generated-blocks/active/")`. The helper calls `resolveGeneratedBlockPaths` internally; pre-appending the suffix would double-path.
  - **D-110 added:** Explicit config-format decision — YAML on disk (`config.yaml`), JSON over IPC. T-125 changes `config_path` from `config.json` → `config.yaml` and adds `serde_yaml` for read/write bridging.

- ✅ **T-124 closed previous fire** — appended full M8 architecture section to `docs/UI_APP_SHELL.md`. Locked D-101..D-109.

- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire
- ↩ 0 commits reverted this fire

## At a glance

Total tasks: 206   Done: 145 (70%)   Blocked: 0   Waiting: 2   Open: 58   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->

## Recent commits

039e733 T-124: M8 architecture spec (D-101..D-109) in UI_APP_SHELL.md
f7a53b9 T-123q: M7.5 round-3 audit follow-ups (M-3 / L-1 / L-3 + Windows CI)
24dcf1a T-123p: defense-in-depth + cosmetic cleanup batch
08fc725 ADR-0014: ratify swc_ecma_parser as Rust runtime dep for Authored-block lint-at-receive (T-163)
4dac6ed M9 backlog: append T-136..T-179 for block-registry refactor + Authored tier

## CI status (origin/main)

latest completed run on `main`: success

Loop is running — T-125 claimed next.
