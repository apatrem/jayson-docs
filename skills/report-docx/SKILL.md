---
name: report-docx
description: |
  Generate an Acme project-delivery report or executive memo as a Word document
  (.docx) — written companion to a delivery deck, executive summary, or memo for
  client distribution. Trigger when the user says: "draft a delivery report,"
  "write an executive memo," "Acme written report," "project report Word
  document," "rapport de mission," or asks for a project-delivery .docx.

  Do not trigger for: the written commercial proposal (use
  commercial-proposal-docx), sales pitches (use commercial-proposal-pptx), or
  presentation decks (use report-pptx).
---

# Skill — report-docx

## 0. Purpose

Produce an **Acme written delivery report / executive memo `.docx`** — the
text-heavy companion to a presentation deck, or a standalone written
deliverable. Uses dolanmiu/docx's `patchDocument` API; charts are native Word
charts.

## 1. Hard rules

Same as `commercial-proposal-docx` §1.

## 2. Read first

1. `docs/DECISIONS_LOG.md` D3 — why dolanmiu/docx.
2. `CHART_CATALOGUE.md`.
3. `src/schema/index.ts`.
4. `src/brand/brand.yaml`.

## 3. Workflow

### Step A — Gather the brief

For a written report, ask for:

- **Client name**.
- **Document type** (executive memo? full report? steering-committee minutes?).
- **Audience** (CEO? Board? operating team?) — drives tone and length.
- **Headline conclusion** (one sentence).
- **Sections to cover** (executive summary, context, approach, findings,
  recommendations, next steps — confirm or adjust the default).
- **Key data** (numbers, charts, tables).
- **Date**.

### Step B — Produce the fill-plan

Build a JSON matching `fillPlanSchema` with `kind: "document"`:

- `kind` = `"document"`
- `meta.templateId` = `"report.master.docx"`
- Standard `meta.client`, `meta.date`, `meta.language`.
- `sections[]` — each `{ title, blocks: [...] }`, blocks from the closed
  block-type set (`src/schema/block.ts`: heading, paragraph, bullets, chart,
  image). Word reflows; you never paginate. The M4 docx pipeline expands the
  block set.

### Step C — Temp file

Save to `tmp/jayson-docs-fillplan-<timestamp>.json`.

### Step D — Invoke the CLI

```bash
./jayson-docs fill \
  --template templates/report.master.docx \
  --plan tmp/jayson-docs-fillplan-<timestamp>.json \
  --out out/<client-shortname>-report.docx
```

### Step E — Surface the result

Path, summary, "open in Word to finalise." Flag any placeholders or sections
that need consultant attention before client distribution.

## 4. Failure modes

Same as `commercial-proposal-docx` §4.
