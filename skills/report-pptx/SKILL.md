---
name: report-pptx
description: |
  Generate an Acme project-delivery deck as a PowerPoint presentation (.pptx) —
  for steering committees, results readouts, end-of-engagement decks, or
  internal findings reviews. Trigger when the user says: "build a delivery
  deck," "draft a steering committee presentation," "make a results deck,"
  "Acme project deck," "client readout slides," or asks for a project-delivery
  .pptx.

  Do not trigger for: the sales / pitch deck (use commercial-proposal-pptx),
  the written proposal (use commercial-proposal-docx), or written reports (use
  report-docx).
---

# Skill — report-pptx

> **v1 scope (D20):** this is the **only implemented skill** in v1. The
> **transitional walking skeleton** uses layout **`kpi-row-chart` only** on the
> placeholder master — other layouts in `SLIDE_LAYOUT_LIBRARY.md` are post-v1
> for that skeleton. The canonical `report.master.pptx` (26 layouts, D22) pins
> four chart kinds (`stacked-column`, `clustered-column`, `line`, `bubble`) on
> dedicated chart layouts; see `CHART_CATALOGUE.md`. Charts: **data-swap only**
> (D21) — do not choose chart type.

## 0. Purpose

Produce an **Acme project-delivery `.pptx`** — slides shown to the client during
or at the end of an engagement. In v1 the CLI fills **`report.master.pptx`** via
the **`kpi-row-chart`** layout only.

## 1. Hard rules

- You never lay out slides, pick coordinates, choose fonts or colours.
- In v1 you use **`layoutId: "kpi-row-chart"` only** — do not pick other layouts
  (`two-column`, `quad`, etc.) until they are implemented post-v1.
- You honour every density cap — enforced by Zod; violations are rejected.
- **Chart type is not your choice.** Each layout pins its `chart` slot to one
  literal `kind` (D21). On the **transitional** `kpi-row-chart` layout that is
  `kind: "stacked-bar"`; on the canonical master use the layout's pinned kind
  (e.g. `chart-stacked-column` → `"stacked-column"`). Supply **data**
  (`datasetRef` or inline `dataset`) only.
- If you are missing information for a required slot, ask one short question.
  Never invent client-specific content.
- If the CLI returns a validation error, surface it **verbatim** — do not silently
  "fix" the fill-plan.

## 2. Read first

1. `docs/SLIDE_LAYOUT_LIBRARY.md` — `kpi-row-chart` slots and density caps.
2. `CHART_CATALOGUE.md` — pinned chart kinds per layout (`stacked-column` on the
   canonical master; `stacked-bar` on the transitional `kpi-row-chart` only) and
   dataset shape.
3. `src/schema/layouts/kpi-row-chart.ts` — the Zod source of truth for v1.
4. `src/schema/index.ts` — `fillPlanSchema` envelope.
5. `src/brand/brand.yaml` — brand tokens (do not override layout or chart type).
6. `fixtures/worked-example-brief.md` + `fixtures/valid-fill-plan.json` — worked
   example (brief → fill-plan → CLI → `.pptx`).

## 3. Two drivers (same fill-plan, same CLI)

### Driver A — BYO LLM (this skill)

You gather the brief, author a schema-valid fill-plan JSON, write it to a temp
file (or pipe via stdin), and invoke the CLI. **No LLM API call lives in the app**
(D11/D15) — you are the LLM.

### Driver B — Human runs the CLI directly

A consultant (or you) may skip the LLM step and run the CLI on an already-valid
fill-plan — e.g. `fixtures/valid-fill-plan.json` or a hand-edited plan. The CLI
path is identical; only who authors the JSON differs.

Both drivers must produce the same result: a brand-correct `.pptx` with named
shapes filled and a native editable chart carrying the fill-plan data.

## 4. Workflow (BYO LLM)

### Step A — Gather the brief

For a delivery deck, ask for:

- **Client name & meeting type** (steering committee? final readout? internal
  review?).
- **Headline finding / recommendation** — the one-sentence punchline (8–15 words
  for the action title).
- **Key metrics & chart data** — figures for the KPI strip (3–5 cards) and the
  chart dataset for the layout's pinned kind (category column + numeric series
  columns for bar/column charts).
- **Narrative bullets** — supporting points for the slide (≤5 bullets, ≤60 words
  total).
- **Audience** and **date of the meeting**.

### Step B — Produce the fill-plan

Build a JSON matching `fillPlanSchema`:

- `kind` = `"deck"`
- `meta.templateId` = `"report.master.pptx"` (logical id — always this string,
  even when the on-disk template is the development placeholder; see Step D).
- `meta.client`, `meta.date`, `meta.language` as standard.
- `sections[]` — each `{ title, slides: [...] }`. In v1 each section's slides use
  **`kpi-row-chart` only** (multiple sections/slides are fine; same layout).
- `datasets` — keyed datasets referenced by `chart.datasetRef`.
- Each `kpi-row-chart` slide must include: `title`, `kpi-strip` (3–5 cards),
  `chart`, `narrative`.

**Chart block (data-swap — D21):**

```jsonc
{
  "kind": "stacked-bar",           // transitional kpi-row-chart only — must match layout literal
  "datasetRef": "my_dataset_key",  // OR inline "dataset": { ... }
  "caption": "optional ≤ 120 chars"
}
```

- Use **`datasetRef`** when the dataset is shared across slides, or an inline
  **`dataset`** object when it is slide-local. At least one is required.
- The pipeline swaps values into the **pre-authored chart** at `slot.chart` in
  the master — it does not build a new chart or change chart type.
- Dataset shape: `columns` (first = category labels; rest = series names) and
  `rows` (each row's length must equal `columns.length`). See `CHART_CATALOGUE.md`.

### Step C — Temp file

Save to `tmp/jayson-docs-fillplan-<timestamp>.json` (project-relative — **never
`/tmp`**). Alternatively, pipe JSON to the CLI with `--plan -` (stdin).

### Step D — Invoke the CLI

**Production** (when Acme has delivered the real master):

```bash
./jayson-docs fill \
  --template templates/report.master.pptx \
  --plan tmp/jayson-docs-fillplan-<timestamp>.json \
  --out out/<client-shortname>-deck.pptx
```

**Development / CI** (until the real master lands — use the committed placeholder):

```bash
npx jayson-docs fill \
  --template templates/PLACEHOLDER-report.master.pptx \
  --plan tmp/jayson-docs-fillplan-<timestamp>.json \
  --out out/<client-shortname>-deck.pptx
```

During local dev from the repo, use `npm run fill -- fill …` (note the `fill`
subcommand twice — once for npm, once for the CLI) or `npx tsx src/cli/generate.ts
fill …` instead of `./jayson-docs` (the binary ships inside the skills pack at
distribution time — D14/D15).

**Stdin** (no temp file):

```bash
npx jayson-docs fill \
  --template templates/PLACEHOLDER-report.master.pptx \
  --plan - \
  --out out/<client-shortname>-deck.pptx < tmp/jayson-docs-fillplan-<timestamp>.json
```

`--template` and `--out` extensions must match (both `.pptx`).

### Step E — Surface the result

Return the output path, a one-line summary, and "open in PowerPoint to edit."
Flag any data the consultant still needs to supply.

## 5. Human-run CLI (Driver B)

When the fill-plan already exists (hand-authored, exported, or from
`fixtures/valid-fill-plan.json`):

```bash
npm run fill -- fill \
  --template templates/PLACEHOLDER-report.master.pptx \
  --plan fixtures/valid-fill-plan.json \
  --out out/teg-steering-deck.pptx
```

See `fixtures/worked-example-brief.md` for the representative brief, expected
fill-plan fields, and what to verify in the output `.pptx`.

## 6. CLI validation errors (surface verbatim)

The CLI validates the fill-plan with Zod **before** touching the master. On
failure it writes to **stderr** and exits **2**:

```
fill-plan validation failed:
<Zod error with JSON paths, e.g. sections[0].slides[0].title: title must be 8–15 words>
```

**Do not** auto-truncate, rename keys, or substitute defaults. Read the path in the
error, fix the fill-plan once, re-run; if still failing, ask the consultant.

Other CLI exits (see `ERROR_HANDLING.md`):

- **2** — validation (`llm`), bad args, missing master, missing named shape.
- **4** — output write failure (`save`).
- **1** — unexpected runtime error.

## 7. Failure modes

- **Master template missing** (`templates/report.master.pptx` or the placeholder):
  tell the consultant; do not proceed.
- **Schema validation failure**: surface the Zod error verbatim; fix once, re-run;
  then ask.
- **Chart kind mismatch**: each layout's `chart.kind` must match its pinned
  literal exactly (`kpi-row-chart` → `"stacked-bar"`; `chart-stacked-column` →
  `"stacked-column"`, etc.) — you cannot substitute another chart type.
- **Bad `datasetRef`**: must resolve to a key in the fill-plan's `datasets` map.
- **Unknown layout**: only `kpi-row-chart` is valid in v1.
- **Unknown keys**: fill-plan objects are `.strict()` — extra keys are rejected.
