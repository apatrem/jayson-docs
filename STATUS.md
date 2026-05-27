# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T14:15:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Progress since the previous fire

- ✅ **T-177 closed this fire** — Settings → My LLM Spend: per-category breakdown section.
  - `src/ui/settings/CostLedgerView.tsx` (UPDATED) — Added "By category" section that aggregates rows by `callKind` (highest spend first). Each callKind is a single bucket per D-34 amendment. Labels: "Authored block generation", "Document generation", "Comment batch", etc. Displays cost + call count per bucket; shows fallback text when no rows recorded.
  - `tests/ui/views/CostLedgerView.test.tsx` (NEW) — 9 tests: "By category" heading renders, `authored-block-generation` label visible, cost formatted, call count singular/plural, all existing category labels render, sort order (highest first), empty state.

- ✅ T-166 closed last fire — Scaffold-mismatch detection + "Regenerate against current scaffold" UX.
- ✅ T-174 — Share flow (sender stamp + OS share-sheet attachment) (ADR-0005).
- ✅ T-173 — Authored-block generation pipeline (ADR-0011 / ADR-0012).
- ✅ T-176 — Cost ledger — new `authored-block-generation` category.

## At a glance

Total tasks: 205   Done: 201 (98%)   Blocked: 0   Open: 1   Skipped: 1

## Next eligible tasks

**T-179** — Update `docs/BLOCK_IMPLEMENTATION_GUIDE.md` for `defineAuthoredBlock` (depends T-159 ✓).

## Recent commits

T-177: My LLM Spend per-category breakdown — authored-block-generation bucket
T-166: scaffold-mismatch detection + Regenerate against current scaffold UX
T-174: share flow — sender stamp + OS share-sheet IPC (ADR-0005)
T-173: authored-block generation pipeline (ADR-0011 / ADR-0012)
T-176: cost-ledger authored-block-generation category + schema migration

## CI status (origin/main)

Latest run: success (post-T-166 push)

Loop is running cleanly — no action needed.
