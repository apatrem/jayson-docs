# T-104: Chart-slot data-swap for the 4 real chart kinds

<!-- Output of Phase 2 (/agentic-workflow:plan). Phase 5 — fill pipeline for the 26 real layouts. -->

## Objective
Extend M3's `kpi-row-chart` chart data-swap to the **real master charts**: `stacked-column`, `clustered-column`, `line`, `bubble` (the four pinned kinds on the `chart-*` layouts). Per **D21**, this is a *data-swap into the pre-authored master chart* — the master chart's type and styling win; only the dataset is replaced. Reuse `resolveChartDataset` / `datasetToChartData`; handle the `bubble` dataset shape (x / y / size).

## Acceptance criteria (must be machine-checkable)
- [ ] Filling `fixtures/layouts/valid-chart-stacked-column.json`, `valid-chart-line.json`, and `valid-chart-bubble.json` swaps the dataset into `slot.chart`; `readPptxChartData` round-trips `series` / `categories` / `values` (and bubble x/y/size) to match the fixture dataset → un-skip + pass `tests/phase5-acceptance.test.ts` › **T-104**.
- [ ] A `kind` that mismatches the slot's pinned kind is still rejected by the schema (no regression of the Phase-3 contract).
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved
- `src/pipeline/chart-data.ts` + the chart-slot fill path in the engine.
- `tests/phase5-acceptance.test.ts` — un-skip the T-104 block.

## Out of scope
- From-scratch / dynamic chart build (post-v1), text & content slots (T-102/T-103), skill (T-105).

## Risks / do-not-touch
- Do NOT change `src/schema/**`, `src/setup/layout-spec.json`, or the master chart styling (D21 — master styling wins). Don't regress the kpi chart swap.

## Meta
- mode: medium          # OOXML chart data-swap is fiddly; bubble has a distinct x/y/size shape (ADR-0004)
- risk: low
- depends-on: T-101
- parallel-safe: yes        # parallel with T-102 and T-103 (separate code path)
- size budget: < 300 changed lines
