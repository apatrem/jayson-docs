# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-28T02:00:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Progress since the previous fire

- ✅ **T-170 closed this fire** — Replacement logic: same-sender v2 replaces v1 in-place.
  - `src/ipc/authored-block.ts` (UPDATED) — `receiveAuthoredBlock` now accepts an optional 5th `archivedDir` parameter; applies the ADR-0009 replacement rule: checks `active/` then `archived/` for an existing same-sender block; if found, replaces in-place (archived stays archived); otherwise installs to `active/`. Derives `archivedDir` from `activeDir` when not supplied.
  - `src/ipc/authored-block.ts` (UPDATED) — new private helper `findExistingInstallDir` checks both directories, reads each candidate's manifest header to verify sender identity before replacing.
  - `tests/ipc/receive-pipeline.test.ts` (NEW) — 6 tests: new block to active/, same-sender v2 replaces v1 in active/, same-sender v2 replaces v1 in archived/, different-sender coexists as new active/ block, derives archivedDir from activeDir, quarantine on lint fail.

- ✅ T-169 closed last fire — BlockPalette filter + Authored-block manager view.
- ✅ T-168 — archived/ folder + RemovedBlockPlaceholder.
- ✅ T-167 — Soft archive IPC commands.

## At a glance

Total tasks: 205   Done: 193 (94%)   Blocked: 0   Waiting: 6   Open: 3   Skipped: 1

## Next eligible tasks

**T-171** — In-document "Create new Authored block" trigger (depends T-169 ✓).
**T-175** — LLM provisioning — authored-block-generation frontier-key category (depends T-135 ✓).
**T-179** — Update `docs/BLOCK_IMPLEMENTATION_GUIDE.md` for `defineAuthoredBlock` (depends T-159 ✓).

(T-166 blocked on T-175 [ ]. T-172–T-174, T-176–T-177 blocked on earlier tasks.)

## Recent commits

T-170: replacement logic — same-sender v2 replaces v1 in-place (ADR-0009)
T-169: BlockPalette filter + Authored-block manager view
T-168: generated-blocks/archived/ folder + RemovedBlockPlaceholder
T-167: soft archive IPC commands + capability ACL update
T-165: quarantine state + UI

## CI status (origin/main)

Latest run: success (post-T-169 push)

Loop is running cleanly — no action needed.
