# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T19:35:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-156** — Migrate Chart block to registry (depends on T-155 ✓).

## Progress since the previous fire

- ✅ **T-155 closed this fire** — Migrate Table block to registry.
  `src/blocks/table/schema.ts` made self-contained; `index.tsx` folds in
  TableNode + Table renderer + tableBlockEditorExtensions helper;
  legacy files deleted; consumers and tests updated.

- ✅ **T-154** — Migrate KpiCards block to registry.
- ✅ **T-153** — Migrate Team block to registry (code in T-150 scope expansion).
- ✅ **T-152** — Migrate RiskMatrix block to registry.
- ⚠ 0 tasks blocked this fire

## At a glance

Total tasks: 205   Done: 177 (86%)   Blocked: 0   Waiting: 2   Open: 25   Skipped: 1

## Recent commits

T-155: migrate Table block to self-contained registry manifest
T-154: migrate KpiCards block to self-contained registry manifest
T-153: close Team migration (code in T-150 scope expansion)
T-152: close RiskMatrix migration (code in T-150 scope expansion)
T-151: close Roadmap migration (code in T-150 scope expansion)

## CI status (origin/main)

Latest run: success (post-T-154 push)

T-155 done; T-156 (Chart migration) is next eligible.
