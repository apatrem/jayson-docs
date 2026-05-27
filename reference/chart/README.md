# Reference block: Chart

The **second worked block** after callout. Demonstrates patterns the simpler blocks don't exercise — required reading before implementing chart, table, roadmap, or risk-matrix.

## The two-file shape (ADR-0008, since T-138)

Same layout as `reference/callout/` — two entry files per block, plus legacy implementation:

| File | Layer | Purpose |
|---|---|---|
| `schema.ts` | **Pure** | Zod schema + cross-field validation + helpers + `schemaEntry` export. No React/TipTap. |
| `index.ts` | **Runtime** | `defineBlock({...})` manifest. Imports schema + node + renderer. Default-exports `BlockRegistryRecord`. |
| `Chart.tsx` | Implementation | React renderer + `getEChartsOption` helper for SSR. Imported by `index.ts`. |
| `ChartNode.tsx` | Implementation | TipTap atom node + JSON-payload mapping helpers. Imported by `index.ts`. |
| `ChartDataPanel.tsx` | Implementation | Side panel for editing (D-24). Wired by the editor on selection change. |
| `chart.test.ts` | Tests | 6-layer Vitest test suite. |

> **Why chart uses `defineBlock` and not `defineAuthoredBlock`:** Chart is an
> atom-node block with a side-panel editor, cross-field schema validation, and
> ECharts-specific SSR helpers. These exceed the Authored-block capability set
> (ADR-0007 restriction). All 15 Standard blocks use `defineBlock`; only the
> Authored tier uses `defineAuthoredBlock`.

## New patterns this block introduces (vs. callout)

### 1. Cross-field schema validation (`superRefine`)
Constraints that depend on multiple fields simultaneously:
- Pie/donut → exactly one series.
- Scatter → `series.values` must have even length (flat [x, y] pairs).
- Bar/line/area → `xLabels` is required.

Use `superRefine` for any block with inter-field rules: `roadmap` (endDate > startDate), `risk-matrix` (risk x/y within grid bounds).

### 2. Atom node + JSON-encoded payload
Chart is a TipTap **atom** (`atom: true`, `content: ""`). The whole data structure is too deep for individual ProseMirror attrs — stash it as a JSON string in a single `payload` attr. The node view parses it on render; `toPm`/`fromPm` serialize/deserialize.

Use this pattern for: `kpi-cards`, `risk-matrix`, `team`, `roadmap`, `timeline`, `diagram`.

Use the callout pattern (rich-text content, multiple attrs) for: `prose`, `heading`, `bullet-list`, `numbered-list`, `callout`.

### 3. Two render paths (browser + SSR)
`getEChartsOption(block, brand)` is the **contract** between paths:
- Browser: mounts ECharts inside `<Chart>`.
- PDF export: calls `getEChartsOption()` in Node, then `renderToSVGString`.

Both paths consume the same option object — no drift.

### 4. Side panel for editing (D-24)
Selecting the chart opens `ChartDataPanel.tsx`. The panel validates each edit through `ChartBlockSchema.safeParse` before committing via `onUpdate(next)`.

### 5. Excel paste
The grid's `onPaste` handler detects tab/comma-delimited text, parses, and overwrites. English-locale only in v1 (O-05).

### 6. Error placeholders for malformed payloads
If the JSON payload can't be parsed, the node view renders a clear error placeholder instead of crashing. Apply to any atom-node block with a JSON payload.

## Test layers (6, vs. callout's 5)

1. Schema — valid fixtures
2. Schema — cross-field validation (`superRefine` rules)
3. Renderer — option-builder uses brand tokens, switches palette
4. Mapping — DocModel ⇄ ProseMirror round-trip
5. Editor — `insertChart` command
6. **Helpers** — `hasCategoryAxis`, `defaultYZeroBased` exhaustive tests

## Where they live in the final repo

| Reference file | Production path |
|---|---|
| `reference/chart/schema.ts` | `src/blocks/chart/schema.ts` |
| `reference/chart/index.ts` | `src/blocks/chart/index.ts` |
| `reference/chart/Chart.tsx` | *(in `src/blocks/chart/` after T-156 migration)* |
| `reference/chart/ChartNode.tsx` | *(in `src/blocks/chart/` after T-156 migration)* |
| `reference/chart/ChartDataPanel.tsx` | *(in `src/blocks/chart/` after T-156 migration)* |
| `reference/chart/chart.test.ts` | `tests/blocks/chart.test.ts` |

## Anti-patterns this reference avoids

- ❌ Storing chart options directly in the schema (couples schema to ECharts).
- ❌ Letting the side panel mutate the DocModel directly (bypasses TipTap's undo stack).
- ❌ Rendering the chart inside the editor with full interactivity.
- ❌ Using `dangerouslySetInnerHTML` for inlined SVG (forbidden by D-09).
