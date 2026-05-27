# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T19:50:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-157a** — Editor-side registry wire-through (delete mapping.ts switches, derive
Editor.tsx from registry). Depends on T-156 ✓ (all 15 blocks migrated).

## Progress since the previous fire

- ✅ **T-156 closed this fire** — Migrate Chart block to registry.
  `src/blocks/chart/schema.ts` self-contained; `index.tsx` folds in
  ChartNode + Chart renderer + ECharts option builder; ChartDataPanel.tsx
  co-located in `src/blocks/chart/`; export pipeline imports updated;
  legacy files deleted; consumers and tests updated.

- ✅ **T-155** — Migrate Table block to registry.
- ✅ **T-154** — Migrate KpiCards block to registry.
- ⚠ 0 tasks blocked this fire

## At a glance

Total tasks: 205   Done: 178 (87%)   Blocked: 0   Waiting: 2   Open: 24   Skipped: 1

## Recent commits

T-156: migrate Chart block to self-contained registry manifest
T-155: migrate Table block to self-contained registry manifest
T-154: migrate KpiCards block to self-contained registry manifest
T-153: close Team migration (code in T-150 scope expansion)
T-152: close RiskMatrix migration (code in T-150 scope expansion)

## CI status (origin/main)

Latest run: success (post-T-155 push)

T-156 done; all 15 blocks now in registry. T-157a (editor wire-through) is next.
