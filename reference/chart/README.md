# Reference block: Chart

The **second worked block** after callout. Demonstrates patterns the simpler blocks don't exercise — required reading before implementing chart, table, roadmap, or risk-matrix.

## Files

| File | Purpose | Lines |
|---|---|---|
| `schema.ts` | Zod schema with cross-field validation + helpers | ~200 |
| `Chart.tsx` | React renderer + exported `getEChartsOption` for SSR | ~230 |
| `ChartNode.tsx` | TipTap atom node + mapping helpers (JSON-encoded payload) | ~210 |
| `ChartDataPanel.tsx` | Side panel for editing (D-24) — grid + Excel paste | ~280 |
| `chart.test.ts` | 6 test layers (added: helpers) | ~220 |

## Where they go in the final repo

| Reference file | Production path |
|---|---|
| `schema.ts` | `src/schema/blocks/chart.ts` |
| `Chart.tsx` | `src/renderer/blocks/Chart.tsx` |
| `ChartNode.tsx` | `src/editor/nodes/ChartNode.tsx` |
| `ChartDataPanel.tsx` | `src/editor/panels/ChartDataPanel.tsx` |
| `chart.test.ts` | `tests/blocks/chart.test.ts` |

## New patterns this block introduces

### 1. Cross-field schema validation (`superRefine`)
Some chart types have constraints that depend on other fields:
- Pie/donut → exactly one series.
- Scatter → series.values must have even length (flat [x, y] pairs).
- Bar/line/area → xLabels is required.

These are NOT field-level rules — they look at multiple fields together. Zod's `superRefine` is the tool. Other blocks with similar needs: `roadmap` (endDate > startDate), `risk-matrix` (risk x/y within grid bounds).

### 2. Atom node + JSON-encoded payload
Chart is a TipTap **atom** (`atom: true`, `content: ""`). The whole data structure (series, axes, etc.) is too deep for individual ProseMirror attrs, so we stash it as a JSON string in a single `payload` attr. The node view parses it on render; the mapping helpers serialize on save.

Use this pattern for any block with:
- Deep nested data (series within series within values).
- Pure structural content (no in-block text editing).
- A dedicated editor surface (side panel) rather than inline editing.

Other blocks that fit: `kpi-cards`, `risk-matrix`, `team`, `roadmap`, `timeline`, `diagram`.

### 3. Two render paths (browser + SSR)
The `getEChartsOption(block, brand)` function is exported so:
- The browser path mounts ECharts directly inside `<Chart>`.
- The PDF export path calls `getEChartsOption()` directly in a Node process, then uses ECharts's headless `setOption` + `renderToSVGString` to produce an SVG that gets inlined into the HTML before Playwright prints it.

The option object is the **contract** between the two paths. Both consume the same option; both produce visually-identical output. No drift.

### 4. Side panel for editing (D-24)
Selecting the chart in the editor opens `ChartDataPanel.tsx` on the right side of the screen. The panel:
- Validates every edit through the schema (`ChartBlockSchema.safeParse`).
- Commits via `onUpdate(next)` only when valid.
- Shows per-field error highlights when invalid.

This is the pattern for editing any block with rich data: pop a side panel, not an inline form. Easier on the consultant's flow than inline modals.

### 5. Excel paste
The data grid's `onPaste` handler detects tab- vs. comma-delimited text, parses headers + body, and overwrites the data. **English-locale numbers only in v1** (per O-05) — `1,234.56` is parsed as 1234.56, `1.234,56` is rejected as NaN. French-locale parsing deferred to v1.1.

### 6. Error placeholders for malformed payloads
If the JSON payload can't be parsed (shouldn't happen — defensive), the node view renders a clear error placeholder instead of crashing. Apply this pattern to any block that stashes data as JSON.

## Test layers (vs. callout's 5)

Callout had 5 layers; chart adds a 6th:
1. Schema — valid fixtures
2. Schema — cross-field validation (NEW emphasis: the `superRefine` rules)
3. Renderer (option-builder) — uses brand tokens, switches palette, hides legend on flag
4. Mapping — DocModel ⇄ ProseMirror round-trip
5. Editor — TipTap insertChart command
6. **Helpers** (NEW) — `hasCategoryAxis`, `defaultYZeroBased` exhaustive tests

Total: ~25 tests for chart vs. ~15 for callout. The extra tests cover the larger schema surface.

## Things this reference deliberately doesn't cover

These are real chart concerns but **out of scope** for v1:
- **Waterfall and Mekko chart types** — the schema accepts them; the renderer falls back to `bar` with a TODO comment. Implementing them properly requires ECharts custom-series — defer to first real consultancy that needs them (likely v1.1).
- **Multi-axis charts** (e.g. bar + line overlay) — schema doesn't model this. If needed, extend with a `chartType: "combo"` variant in a future schema bump.
- **Chart annotations** (callout arrows pointing at data points) — explicitly deferred per memo §10 ("not a think-cell clone").
- **French-locale Excel-paste parsing** (O-05) — see §5 above.
- **Animation tuning** — ECharts defaults are fine; animation tweaks are not a brand-token concern in v1.

## When implementing T-32 in the real project

1. Copy these four production files in order.
2. Wire `ChartTipTapNode` into the editor's extensions (T-75).
3. Wire the side panel into the editor's selection-change handler (when the selected node is `chart`, open the panel).
4. Wire `Chart` into the document renderer's block dispatch (T-51).
5. Add the SSR pre-render step in `src/export/pre-render-charts.ts` that walks the rendered HTML, finds chart placeholders, calls `getEChartsOption()`, and inlines the SVG.

That sequence yields a fully-functional chart block in roughly the 12 hours T-32 estimates.

## Anti-patterns this reference avoids

- ❌ Storing chart options directly in the schema (couples schema to ECharts). The schema describes *data + display intent*; `getEChartsOption` converts to ECharts-specific config.
- ❌ Letting the side panel mutate the DocModel directly (bypasses TipTap's undo stack). All edits go through `updateAttributes` on the node.
- ❌ Rendering the chart inside the editor with full interactivity (zoom, drag, click handlers). The editor preview is read-only; interactivity is for client-facing HTML deliverables only.
- ❌ Using `dangerouslySetInnerHTML` for the inlined SVG. The SSR step builds the SVG string and passes it through React's `<svg dangerouslySetInnerHTML>`. **Forbidden by D-09.** Use React's `parseFromString` + `JSDOM` + DOM-to-React conversion, or write the SVG as JSX components in a pre-render step.

## What an LLM building chart from this reference should do

1. Read `schema.ts` first — the data shape drives everything.
2. Read `getEChartsOption` in `Chart.tsx` — that's the contract.
3. Implement the node + mapping (cookie-cutter from the reference).
4. Implement the side panel last — it's the most UI-heavy file.
5. Pull tests from `chart.test.ts` and adjust for whatever case-specific edits.

Estimated total time: 12 hours for an experienced developer. ~16 hours for a strong LLM with the reference as context.
