# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T19:25:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-155** — Migrate Table block to registry (depends on T-154 ✓).

## Progress since the previous fire

- ✅ **T-154 closed this fire** — Migrate KpiCards block to registry.
  `src/blocks/kpi-cards/schema.ts` made self-contained; `index.tsx` folds in
  KpiCardsNode + KpiCards renderer; legacy files deleted; consumers updated.

- ✅ **T-153** — Migrate Team block to registry (code in T-150 scope expansion).
- ✅ **T-152** — Migrate RiskMatrix block to registry.
- ✅ **T-151** — Migrate Roadmap block to registry.
- ⚠ 0 tasks blocked this fire

## At a glance

Total tasks: 205   Done: 176 (86%)   Blocked: 0   Waiting: 2   Open: 26   Skipped: 1

## Recent commits

T-154: migrate KpiCards block to self-contained registry manifest
T-153: close Team migration (code in T-150 scope expansion)
T-152: close RiskMatrix migration (code in T-150 scope expansion)
T-151: close Roadmap migration (code in T-150 scope expansion)
T-150: migrate Timeline block + Roadmap/RiskMatrix/Team to registry

## CI status (origin/main)

Latest run: in_progress (post-T-153 push); prior run success

T-154 done; T-155 (Table migration) is next eligible.
