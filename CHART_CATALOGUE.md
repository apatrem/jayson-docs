# Chart Catalogue

JSON shapes for chart blocks in fill-plans, and how they are realised at fill time.

All charts produced are **native PowerPoint charts** — editable in PowerPoint, never images.

---

## v1 — what is actually supported (D20/D21)

**v1 supports only chart kinds pinned by an implemented layout slot in the master template.** The LLM **does not choose chart type** — it picks a layout and supplies **data**; Zod pins each chart slot's `kind` to a literal.

Today (the report-pptx walking skeleton) that is exactly **one** slot:

| Layout | Slot | Pinned `kind` | Master requirement |
|--------|------|---------------|-------------------|
| `kpi-row-chart` | `chart` | `stacked-bar` | `templates/report.master.pptx` must contain a pre-authored **stacked-bar** chart at `slot.chart` |

**Fill route:** `pptx-automizer` swaps the dataset into that pre-authored chart. No PptxGenJS build in v1.

If a fill-plan's chart `kind` does not match the layout slot's pinned literal, validation **rejects** it (D21 corollary). Do not treat the reference kinds below as user-selectable in v1.

---

## Universal shape

Every chart block has the form:

```jsonc
{
  "kind": "<pinned by layout slot — not user-selectable in v1>",
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

## Reference catalogue — kinds when a layout/master slot pins them (post-v1 seed)

The per-type notes below document **dataset contracts** and **deferred** pipeline routes for when additional layouts and masters pre-author these types. They are **not** all available in v1. In v1, read each "Pipeline" note as: *the master pre-authors this type at a named slot; automizer swaps the data.*

### `bar`

Vertical or horizontal bar chart.

- Columns: first column = category labels (string); remaining columns = numeric series. Each series becomes one set of bars.
- Pipeline (deferred build route): if the master's placeholder type is `bar`, swap data via pptx-automizer. Otherwise build with PptxGenJS (`pres.addChart(pptx.charts.BAR, ...)`).

### `stacked-bar`

Stacked bar chart.

- Same shape as `bar`. Series stack from left to right (or bottom to top for horizontal).
- **v1:** `kpi-row-chart` pins this kind; automizer data-swap only.
- Pipeline (deferred build route): PptxGenJS uses `barGrouping: 'stacked'`.

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
- **Not in the v1 walking skeleton.** Supported only when a layout slot pins `waterfall` **and** the master pre-authors a native waterfall (PowerPoint extended-chart / `chartEx`). PptxGenJS 4.x has **no** waterfall build API. Verify `pptx-automizer` can update `chartEx` data before relying on swap.

---

## Implementation notes

- **v1 (D21):** swap data via `pptx-automizer`'s chart-data API into the chart pre-authored in the master. Preserves styling set in the master.
- **Deferred:** build chart objects with PptxGenJS and inject via pptx-automizer for types not pre-authored in the master. See `pptx-automizer/__tests__/generate-pptxgenjs-charts.test.ts`.
- **Chart colours (v1):** the **master chart's styling wins** (D2-2, D21). `brand.yaml` colours apply only to the deferred PptxGenJS route.
- For dataset reuse across slides, prefer `datasetRef` pointing at the top-level `datasets` map over inlining the dataset on every chart.
