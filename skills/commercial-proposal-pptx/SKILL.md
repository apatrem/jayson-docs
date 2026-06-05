---
name: commercial-proposal-pptx
description: |
  Generate an Acme commercial proposal as a PowerPoint deck (.pptx) — sales pitch
  for winning a mandate. Trigger when the user says: "build an Acme commercial
  proposal," "draft a pitch deck for [client]," "make a sales presentation deck,"
  "propale PPT," "commercial proposal slides," or asks for a .pptx commercial
  proposal.

  Do not trigger for: the written proposal (use
  commercial-proposal-docx), delivery decks (use report-pptx), or written reports
  (use report-docx).
---

# Skill — commercial-proposal-pptx

> **Status: post-v1 (D20).** Only **`report-pptx`** + **`kpi-row-chart`** is
> implemented in v1. If triggered before this skill's pipeline lands, point the
> consultant to `report-pptx` or explain the post-v1 status.

## 0. Purpose

Produce an **Acme commercial proposal `.pptx`** by filling a hand-designed master
template via the CLI. Your own agentic LLM (BYO LLM) is the LLM — you produce the
fill-plan JSON in context; the CLI does the mechanical fill. *Not wired in v1.*

## 1. Hard rules

- You never lay out slides, pick coordinates, choose fonts or colours.
- You only pick a `layoutId` from the closed enum in `src/schema/slide.ts` and
  fill typed slots per the layout's Zod schema.
- You honour every density cap (word counts, bullet counts, KPI count) — they
  are enforced by Zod and your output will be rejected if you violate them.
- You never choose chart type — each layout slot pins `kind` (D21). Supply data
  only; see `CHART_CATALOGUE.md` for the pinned kind per layout when implemented.
- If you are missing information for a required slot, ask the consultant one
  short question. Never invent client-specific content.
- If the CLI returns a validation error, surface it to the consultant
  verbatim — do not silently "fix" the fill-plan.

## 2. Read first

Before producing the fill-plan, read these files in context:

1. `docs/SLIDE_LAYOUT_LIBRARY.md` — the layouts, their slots, density caps.
2. `CHART_CATALOGUE.md` — JSON shape per approved chart kind.
3. `src/schema/index.ts`, `src/schema/slide.ts`, `src/schema/layouts/*.ts` —
   the Zod source of truth.
4. `src/brand/brand.yaml` — brand tokens (do not override).

## 3. Workflow

### Step A — Gather the brief

Ask the consultant, one short question at a time, until you have:

- **Client name** (full legal name + short name if different).
- **Project goal** (one sentence — what mandate the proposal pitches).
- **Outline** (5–10 bullets of what the proposal will cover; you may suggest a
  default structure based on similar mandates and ask the consultant to confirm).
- **Key data** (numbers / datasets the consultant wants to show; ask if any
  charts are needed).
- **Deadline** (when the proposal is needed; informs urgency, not content).

Ask only what you genuinely need. If the consultant gives you a long brief up
front, parse it and ask only for the missing pieces.

### Step B — Produce the fill-plan

Build a JSON object matching `fillPlanSchema` from `src/schema/index.ts`:

- `kind` = `"deck"`
- `meta.templateId` = `"commercial-proposal.master.pptx"`
- `meta.client` = the client's name
- `meta.date` = today's date (ISO)
- `meta.language` = `"fr"` or `"en"` (ask if unclear)
- `sections[]` = ordered sections, each `{ title, slides: [...] }`. The section
  `title` feeds the tracker breadcrumb and is not rendered as a slide. Each
  slide is `{ layoutId, ...slot values }`.
- `datasets` = top-level keyed datasets referenced by `chart.datasetRef`

*Post-v1:* pick layouts from the closed enum as they are implemented. A standard
commercial proposal may use section-divider, two-column, chart-full-with-takeaway,
kpi-row-chart, quad, etc. — **none of these except `kpi-row-chart` on
`report.master.pptx` are available in v1** (see `report-pptx`).

### Step C — Write the fill-plan to a temp file

Save the JSON to `tmp/jayson-docs-fillplan-<timestamp>.json`. Use `Bash` or
`Write` per your LLM environment.

### Step D — Invoke the CLI

Run, from the project root:

```bash
./jayson-docs fill \
  --template templates/commercial-proposal.master.pptx \
  --plan tmp/jayson-docs-fillplan-<timestamp>.json \
  --out out/<client-shortname>-proposal.pptx
```

### Step E — Surface the result

Tell the consultant:

- the absolute path to the generated `.pptx`,
- a one-paragraph summary of what's in it (slide count, key choices),
- a reminder that they should now open it in PowerPoint to edit / finalise.

If the CLI exits non-zero, surface the stderr verbatim. Do not retry blindly;
if it is a schema validation error, fix the fill-plan in context and re-run,
once. After that, ask the consultant.

## 4. Failure modes

- **Master template missing** (`templates/commercial-proposal.master.pptx` not
  found): tell the consultant the template hasn't been installed yet. Do not
  proceed.
- **Schema validation failure**: read the Zod error, identify the bad slot, fix
  the fill-plan in context, re-run the CLI once. After that, surface to user.
- **Chart kind mismatch**: chart `kind` must match the layout slot's pinned
  literal (D21); fix the fill-plan or ask the consultant.
- **Density cap exceeded**: shorten the offending field, redo the CLI call. If
  the consultant explicitly asked for more content, push back — the caps exist
  to protect the layout.
