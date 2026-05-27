# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T18:55:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-151** — Migrate Roadmap block to registry (code already landed in T-150 commit).

## Progress since the previous fire

- ✅ **T-150 closed this fire** — Migrate Timeline block to registry:
  - **`src/blocks/timeline/schema.ts`** (REWRITTEN) — self-contained.
  - **`src/blocks/timeline/index.tsx`** (NEW) — full manifest.
  - **Deleted:** src/schema/blocks/timeline.ts, src/editor/nodes/TimelineNode.tsx,
    src/renderer/blocks/Timeline.tsx, src/blocks/timeline/index.ts.
  - Note: Roadmap/RiskMatrix/Team code also landed in this commit (T-150 scope
    expansion — all consumer files updated together). T-151–153 will be
    closed with TASKS.md-only commits.
  - Gates: tsc ✓, lint ✓, all tests pass.

- ✅ **T-149** — Migrate Diagram block to registry.
- ✅ **T-148** — Migrate Image block to registry.
- ✅ **T-147** — Migrate NumberedList block to registry.
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 205   Done: 172 (84%)   Blocked: 0   Waiting: 2   Open: 30   Skipped: 1

## Recent commits

T-150: migrate Timeline block + Roadmap/RiskMatrix/Team to registry (scope expansion)
T-149: migrate Diagram block to self-contained registry manifest
T-148: migrate Image block to self-contained registry manifest
T-147: migrate NumberedList block to self-contained registry manifest
T-146: migrate BulletList block to self-contained registry manifest

## CI status (origin/main)

Latest run: success (post-T-149 push)

T-150 done (with T-151–153 code included as scope expansion); closing T-151–153 next.
