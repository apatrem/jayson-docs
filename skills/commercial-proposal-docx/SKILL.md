---
name: commercial-proposal-docx
description: |
  Generate an Acme commercial proposal as a Word document (.docx) — the written
  (document) form of the pitch, a propale. Trigger when the user says: "write a
  written commercial proposal," "draft a propale Word document," "commercial
  proposal Word document," "written proposal for [client]," or asks for a .docx
  commercial proposal.

  Do not trigger for: the PowerPoint sales pitch (use commercial-proposal-pptx),
  delivery presentations (use report-pptx), or delivery reports (use report-docx).
  This skill does not produce a lettre de mission / contract — that fixed-skeleton
  deliverable is out of scope (see CONTEXT.md → Deferred concepts).
---

# Skill — commercial-proposal-docx

> **Status: post-v1 (D20).** The DOCX pipeline is **not implemented** in v1. If
> triggered before M4 lands, explain that only **`report-pptx`** (`kpi-row-chart`)
> is available today. **DOCX charts are post-v1** (D21).

## 0. Purpose

Produce an **Acme written commercial proposal `.docx`** — the document form of the
pitch (propale). *When implemented*, it is **composed** from sections and blocks
(`kind: "document"`): Word paragraphs and bullets via dolanmiu/docx
`patchDocument`; chart handling is TBD per D21.

## 1. Hard rules

Same as `commercial-proposal-pptx` — see that SKILL.md §1. The only differences
here are format-specific:

- Output is a `.docx`, not a `.pptx`. The fill-plan `kind` is `"document"`.
- A document has **no slide-layouts and no `layoutId`**. Each Section holds a
  flowing list of **blocks** from the closed block-type set (`src/schema/block.ts`):
  heading, paragraph, bullets, chart, image. Word reflows; you never paginate.
- You still follow a soft **standard structure** (Step A) — nudge toward it,
  then add or remove sections with the consultant. It is a default, not a fixed
  skeleton.
- Charts in DOCX are post-v1 — see `CHART_CATALOGUE.md` and D21.

## 2. Read first

1. `docs/DECISIONS_LOG.md` D3 — why dolanmiu/docx.
2. `CHART_CATALOGUE.md` — chart kinds (same catalogue as PPTX).
3. `src/schema/index.ts` — `fillPlanSchema` (`kind: "document"` branch).
4. `src/schema/block.ts` — the closed block-type set a Section may hold.
5. `src/brand/brand.yaml` — brand tokens.

## 3. Workflow

### Step A — Gather the brief

A written proposal is narrative where the pitch deck is visual. Ask, one short
question at a time, until you have:

- **Client name** (full legal name + short name if different).
- **Mandate / goal** (one sentence — what the proposal pitches).
- **Outline** — offer the standard proposal structure and ask the consultant to
  add or remove sections: context → understanding of the need → proposed
  approach → team → timeline → fees → why Acme.
- **Key data** (numbers / datasets to show as charts or tables).
- **Language** (`fr` / `en`) and **date**.

Ask only what you genuinely need; if the consultant gives a long brief, parse it
and ask only for the missing pieces.

### Step B — Produce the fill-plan

Build a JSON matching `fillPlanSchema` with `kind: "document"`:

- `meta.templateId` = `"commercial-proposal.master.docx"`
- `meta.client`, `meta.date`, `meta.language`.
- `sections[]` — each `{ title, blocks: [...] }`, blocks drawn from the closed
  block-type set. Follow the standard structure from Step A; adapt to the brief.

### Step C — Temp file

Save to `tmp/jayson-docs-fillplan-<timestamp>.json`.

### Step D — Invoke the CLI

```bash
./jayson-docs fill \
  --template templates/commercial-proposal.master.docx \
  --plan tmp/jayson-docs-fillplan-<timestamp>.json \
  --out out/<client-shortname>-proposal.docx
```

### Step E — Surface the result

Same as the PPTX skill — give the path, a one-paragraph summary, and a reminder
that the consultant should open it in Word to finalise.

## 4. Failure modes

Same as `commercial-proposal-pptx` §4. Additionally:

- **DOCX not implemented in v1** (D20): do not invoke the CLI for `.docx` until
  the pipeline lands.
- **Document block schema still expanding** (post-v1): if the consultant needs a block
  type not yet in `src/schema/block.ts` (e.g. table, kpi-cards), say so and ask
  how to proceed. Do not invent a block type the schema does not define.
