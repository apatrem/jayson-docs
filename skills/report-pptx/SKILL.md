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

> **v1 scope (D20):** this is the **only implemented skill** in v1. Use layout
> **`kpi-row-chart` only** — other layouts in `SLIDE_LAYOUT_LIBRARY.md` are
> post-v1. Charts: **data-swap only** into the pre-authored `stacked-bar` at
> `slot.chart` (D21) — do not choose chart type.

## 0. Purpose

Produce an **Acme project-delivery `.pptx`** — slides shown to the client during
or at the end of an engagement. In v1 the CLI fills **`report.master.pptx`** via
the **`kpi-row-chart`** layout only.

## 1. Hard rules

- You never lay out slides, pick coordinates, choose fonts or colours.
- In v1 you use **`layoutId: "kpi-row-chart"` only** — do not pick other layouts
  (`two-column`, `quad`, etc.) until they are implemented post-v1.
- You honour every density cap — enforced by Zod; violations are rejected.
- **Chart type is not your choice.** `kpi-row-chart`'s `chart` slot is pinned to
  `kind: "stacked-bar"`. Supply **data** (`datasetRef` or inline `dataset`) only.
- If you are missing information for a required slot, ask one short question.
  Never invent client-specific content.
- If the CLI returns a validation error, surface it verbatim — do not silently
  "fix" the fill-plan.

## 2. Read first

1. `docs/SLIDE_LAYOUT_LIBRARY.md` — `kpi-row-chart` slots and density caps.
2. `CHART_CATALOGUE.md` — v1 pinned chart (`stacked-bar`) and dataset shape.
3. `src/schema/layouts/kpi-row-chart.ts` — the Zod source of truth for v1.
4. `src/schema/index.ts` — `fillPlanSchema` envelope.
5. `src/brand/brand.yaml` — brand tokens (do not override layout or chart type).

## 3. Workflow

### Step A — Gather the brief

For a delivery deck, ask for:

- **Client name & meeting type** (steering committee? final readout? internal
  review?).
- **Headline finding / recommendation** — the one-sentence punchline.
- **Key metrics & chart data** — figures for the KPI strip and the stacked-bar
  dataset (categories + series values).
- **Narrative bullets** — supporting points for the slide (≤5 bullets, ≤60 words).
- **Audience** and **date of the meeting**.

### Step B — Produce the fill-plan

Build a JSON matching `fillPlanSchema`:

- `kind` = `"deck"`
- `meta.templateId` = `"report.master.pptx"`
- `meta.client`, `meta.date`, `meta.language` as standard.
- `sections[]` — each `{ title, slides: [...] }`. In v1 each section's slides use
  **`kpi-row-chart` only** (multiple sections/slides are fine; same layout).
- `datasets` — keyed datasets referenced by `chart.datasetRef`.
- Each `kpi-row-chart` slide must include: `title`, `kpi-strip` (3–5 cards),
  `chart` with `kind: "stacked-bar"` (pinned — must match exactly), `narrative`.

### Step C — Temp file

Save to `tmp/jayson-docs-fillplan-<timestamp>.json`.

### Step D — Invoke the CLI

```bash
./jayson-docs fill \
  --template templates/report.master.pptx \
  --plan tmp/jayson-docs-fillplan-<timestamp>.json \
  --out out/<client-shortname>-deck.pptx
```

### Step E — Surface the result

Path, summary, "open in PowerPoint to edit." Flag any data the consultant still
needs to supply.

## 4. Failure modes

- **Master template missing** (`templates/report.master.pptx`): tell the
  consultant; do not proceed.
- **Schema validation failure**: read the Zod error, fix once, re-run; then ask.
- **Chart kind mismatch**: `kpi-row-chart` requires `kind: "stacked-bar"` — you
  cannot substitute another chart type in v1.
- **Unknown layout**: only `kpi-row-chart` is valid in v1.
