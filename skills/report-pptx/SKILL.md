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

## 0. Purpose

Produce a **Acme project-delivery `.pptx`** — slides shown to the client during
or at the end of an engagement (steering committees, milestone reviews,
final readouts). Same template-fill pipeline as `commercial-proposal-pptx`; the
master template is different and the layout mix tilts toward findings, data
visualisations, and recommendations rather than scope / fees.

## 1. Hard rules

Same as `commercial-proposal-pptx` §1.

## 2. Read first

Same as `commercial-proposal-pptx` §2.

## 3. Workflow

### Step A — Gather the brief

For a delivery deck, ask for:

- **Client name & meeting type** (steering committee? final readout? internal
  review?).
- **Headline finding / recommendation** — the one-sentence punchline of the deck.
- **Outline** (sections to cover; offer a default structure: context recap →
  approach → findings → recommendations → next steps).
- **Key data** (charts, tables, KPI summaries — get the actual numbers).
- **Audience** (CEO? ExCom? operating team?) — adjusts tone and depth.
- **Date of the meeting**.

### Step B — Produce the fill-plan

Build a JSON matching `fillPlanSchema`:

- `kind` = `"deck"`
- `meta.templateId` = `"report.master.pptx"`
- `meta.client`, `meta.date`, `meta.language` as standard.
- `sections[]` — ordered sections, each `{ title, slides: [...] }` (the `title`
  feeds the tracker breadcrumb). Within a section, pick slide layouts: e.g.
  kpi-row-chart for headline metrics, chart-full-with-takeaway for central
  findings, bullets-and-image for narrative, quad for a recommendations matrix.

### Step C — Temp file

Save to `tmp/jayson-docs-fillplan-<timestamp>.json`.

### Step D — Invoke the CLI

```bash
npx jayson-docs fill \
  --template templates/report.master.pptx \
  --plan tmp/jayson-docs-fillplan-<timestamp>.json \
  --out out/<client-shortname>-deck.pptx
```

### Step E — Surface the result

Path, summary, "open in PowerPoint to edit." If specific slides reference data
that wasn't provided, flag the placeholder fields you used and the data the
consultant still needs to supply.

## 4. Failure modes

Same as `commercial-proposal-pptx` §4.
