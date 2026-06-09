# T-104: Chart-slot data-swap for the 4 real chart kinds

<!-- Output of Phase 2 (/agentic-workflow:plan). Phase 5 — fill pipeline for the 26 real layouts. -->

## Objective

Extend M3's `kpi-row-chart` chart data-swap to the **real master charts**: `stacked-column`, `clustered-column`, `line`, `bubble` (the four pinned kinds on the `chart-*` layouts). Per **D21**, this is a _data-swap into the pre-authored master chart_ — the master chart's type and styling win; only the dataset is replaced. Reuse `resolveChartDataset`; keep categorical/line mapping in `datasetToChartData`, add an explicit bubble mapper, and use `modify.setChartBubbles` for x/y/size data.

## Acceptance criteria (must be machine-checkable)

- [ ] Filling all four chart fixtures (`stacked-column`, `clustered-column`, `line`, `bubble`) swaps the dataset into `slot.chart`; `readPptxChartDataForShape` follows the output slide's named-shape relationship and round-trips exact series/categories/values or bubble x/y/size → un-skip + pass `tests/phase5-acceptance.test.ts` › **T-104**.
- [ ] The line layout also fills `slot.chart-title`, closing the text-slot coverage intentionally deferred from T-102.
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

- mode: medium # OOXML chart data-swap is fiddly; bubble has a distinct x/y/size shape (ADR-0004)
- risk: low
- depends-on: T-101, T-102, T-103
- parallel-safe: no # shares the generic dispatcher and acceptance file
- size budget: < 300 changed lines
