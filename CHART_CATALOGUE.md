# Chart Catalogue

Approved chart types for v1, with their JSON shapes (as consumed by the schema and produced by the LLM) and notes on how each is realised at fill time.

All charts produced are **native PowerPoint charts** — editable in PowerPoint, never images. See `docs/DECISIONS_LOG.md` D2 / D8.

**v1 route (D21):** charts are produced by **`pptx-automizer` swapping data into a chart pre-authored in the master** — the supported kinds are whatever the master pre-authors, and a chart slot's **type is fixed by the layout** (the LLM supplies *data*, not type). Building charts from scratch via PptxGenJS (for variable types) is **deferred**. The per-type "Pipeline" notes below describe that deferred build route; in v1 read them as "the master pre-authors this type; automizer swaps the data."

---

## Universal shape

Every chart block in a brief has the form:

```jsonc
{
  "kind": "bar | stacked-bar | line | area | pie | doughnut | scatter | waterfall",
  "datasetRef": "tier1_demand_2032",   // OR inline `dataset` below
  "dataset": {                          // optional inline alternative
    "id": "tier1_demand_2032",
    "title": "Tier-1 industries — 2032 demand scenarios (TWh)",
    "columns": ["industry", "low", "base", "high"],
    "rows": [
      ["Industry A", 120, 240, 380]
    ]
  },
  "caption": "optional caption ≤ 120 chars"
}
```

Either `datasetRef` (resolving to a key in the fill-plan's `datasets` map) or an inline `dataset` is required.

Validation: the dataset must have ≥1 column, ≥1 row; all rows must have the same arity as `columns`.

---

## Per-type semantics

### `bar`

Vertical or horizontal bar chart.

- Columns: first column = category labels (string); remaining columns = numeric series. Each series becomes one set of bars.
- Pipeline: if the master's chart placeholder type is `bar`, swap data via pptx-automizer. Otherwise build with PptxGenJS (`pres.addChart(pptx.charts.BAR, ...)`).

### `stacked-bar`

Stacked bar chart.

- Same shape as `bar`. Series stack from left to right (or bottom to top for horizontal).
- Pipeline: PptxGenJS uses `barGrouping: 'stacked'`.

### `line`

Line chart.

- Columns: first column = x-axis category (string or numeric); remaining columns = numeric series.

### `area`

Area chart.

- Same shape as `line`.

### `pie`

Pie chart (single series).

- Columns: exactly two — `[label, value]`. Each row = one slice.
- Validation: rows ≤ 8 (consulting best practice; the schema enforces).

### `doughnut`

Doughnut chart.

- Same shape and constraints as `pie`.

### `scatter`

XY scatter.

- Columns: first = series label; remaining = `[x, y]` pairs in alternating order, or two columns per series labelled `<series>.x`, `<series>.y`. **Prefer the latter form for clarity.**

### `waterfall`

Waterfall chart.

- Columns: `["label", "value", "kind"]`, where `kind` is `"start" | "increase" | "decrease" | "end" | "total"`.
- Example:
  ```json
  [
    ["Phase 1 fees", 108000, "start"],
    ["Phase 1 expert calls", 12000, "increase"],
    ["Phase 2 fees", 72000, "increase"],
    ["Phase 2 expert calls", 8000, "increase"],
    ["Total budget", 200000, "total"]
  ]
  ```
- Pipeline (v1): waterfall is supported **only if pre-authored in the master** (PowerPoint has a native waterfall); `pptx-automizer` swaps its data. PptxGenJS 4.x has **no** waterfall build API, so the from-scratch route is N/A. Waterfall uses PowerPoint's *extended-chart* (`chartEx`) part — **verify `pptx-automizer` can update `chartEx` data during M3** before relying on it.

---

## Implementation notes

- For chart **types matching the template placeholder**: swap data via `pptx-automizer`'s chart-data API. Lowest friction; preserves any styling set in the master.
- For chart **types not in the template**: build the chart object with PptxGenJS, then inject it via pptx-automizer's slide-modification API. See `pptx-automizer/__tests__/generate-pptxgenjs-charts.test.ts` for the canonical example.
- Colour palette comes from `src/brand/brand.yaml` (`colors.primary`, `colors.secondary`, `colors.accent`). Do not hard-code chart colours in code.
- For dataset reuse across slides, prefer `datasetRef` pointing at the top-level `datasets` map in the fill-plan over inlining the dataset on every chart.
