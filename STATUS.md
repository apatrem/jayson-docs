# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T10:30:23Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-125** — Harden remaining fs + config IPC commands (4h).
- Depends-on: T-124 (`[x]` this fire).
- Implements the IPC layer that T-126's `createIpcBootStrategy` reads from (`read_app_config`, `file_exists`) and the library scaffold (`list_directory`).
- Loop paused for user approval per "until next milestone approval" — T-124 ratifies the M8 architecture spec (D-101..D-109); the user reviewing those decisions before T-125..T-134 implement against them is the natural human-checkpoint inside this milestone.

## Progress since the previous fire

- ✅ **T-124 closed this fire** — appended a full M8 architecture section to `docs/UI_APP_SHELL.md` (529 → 855 lines). Locks 9 architectural decisions:
  - **D-101 — Partial config schema:** introduce `M8PartialConfigSchema` requiring only `paths.cloudSyncRoot`; the full `InstallAppConfigSchema` (M9 install state) is a structural widen. Rejected alternatives: optional-fields and sentinel-stub. Migration is one-way idempotent (`schemaVersion: "0.1.0"` → `"0.2.0"`).
  - **D-102 — Router library:** custom typed routes — no new dependency. The desktop app has no URL bar; routes are intents. React Router DOM + TanStack Router rejected for adding ~30 KB to satisfy URL semantics the app doesn't have.
  - **D-103 — Boot strategy:** `createIpcBootStrategy()` reads config, parses against the M8 + Install schemas, checks `file_exists(cloudSyncRoot)`, routes to `folder-picker` (`reason: 'first-launch' | 'missing'`) or `library`. A strategy interface seam lets tests inject a fake (preserves M7-spike test path).
  - **D-104 — Library-first launch:** no `lastOpenPath` persistence. App always boots to library or folder-picker, never directly into a previously-open document.
  - **D-105 — Multi-doc-ready route shape:** `document` route carries `openDocs: Array<{id, path}>` + `activeIndex` even though M8 invariant is `openDocs.length === 1`. M9+ tab bar reads the array without rearchitecting.
  - **D-106 — Library state lifecycle:** M8 implements only launch-scan via `scanCloudSyncRoot()`. Recursive `list_directory` + per-folder `read_yaml_file` parsing **only** the `meta:` block. Performance budget: 100-doc fixture < 400 ms locally (extrapolates to the < 2 s for 500-doc UI_LIBRARY budget).
  - **D-107 — "Use Sample" empty-state:** Vite raw import of `examples/sample-proposal.yaml`, write to `<cloudSyncRoot>/Sample Proposal.yaml`, re-scan.
  - **D-108 — Templates:** 4 YAML files committed under `templates/`, loaded via Vite raw imports. Clone path regenerates stable IDs (`meta.docId`, every block/section/slide id) at clone time to avoid future collision when M9 ships comment-thread tracking.
  - **D-109 — Generated-blocks runtime loading:** new `GeneratedBlocksContext` populated at app startup from `<cloudSyncRoot>/generated-blocks/active/`. Wired through DocumentView into BlockPalette's existing `generatedBlocks` slot. Failure path: log + degrade to defaults only.
  - Plus the **M8 component file map** (every NEW file with its owning task) and the **M8 acceptance gate** (T-134 ships it; `verify-gates.sh` + the new m8-* integration tests + the M7-spike happy-path test still passing).

- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire
- ↩ 0 commits reverted this fire

## Loop paused at M8 architecture-ratification checkpoint

T-124's Acceptance: "spec covers every M8 surface concretely enough that T-125..T-134 can execute without further architectural latitude." That's the natural human-approval point inside the M8 milestone — review D-101..D-109 in `docs/UI_APP_SHELL.md` and then re-fire `/loop /next-task` (or `/next-task` directly) to authorize T-125 onward.

If any of D-101..D-109 needs adjustment, edit the relevant section in `docs/UI_APP_SHELL.md` before re-firing. The downstream tasks (T-125..T-134) all read from this spec — changes propagate without code churn yet.

## At a glance

Total tasks: 206   Done: 145 (70%)   Blocked: 0   Waiting: 2   Open: 58   Skipped: 1
<!-- Counts use the repo's compound-split convention: a header like
     "### T-76 + T-77 [x] · ..." counts as 2 IDs across 1 line.
     Raw `grep -c '^### T-'` over docs/TASKS.md returns 1 fewer
     (line-count). The summary table at the bottom of TASKS.md uses
     the same compound-split convention. -->

## Recent commits

f7a53b9 T-123q: M7.5 round-3 audit follow-ups (M-3 / L-1 / L-3 + Windows CI)
24dcf1a T-123p: defense-in-depth + cosmetic cleanup batch
08fc725 ADR-0014: ratify swc_ecma_parser as Rust runtime dep for Authored-block lint-at-receive (T-163)
4dac6ed M9 backlog: append T-136..T-179 for block-registry refactor + Authored tier
ebe84b9 Architecture: introduce three-tier block library + Authored-block tier (ADR-0004..0013)
3ec541e Add team-meeting.jpg fixture asset for M7 image export tests.
00c5b57 Add inline editing for KPI cards and diagram blocks in the editor.
5a382f3 Fix export_pdf IPC args to match frontend invoke shape.

## CI status (origin/main)

latest completed run on `main`: success

Loop is running cleanly — no action needed besides reviewing D-101..D-109
in `docs/UI_APP_SHELL.md` and re-firing when ready.
