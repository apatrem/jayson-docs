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

> **v1 scope (D20):** this is the **only implemented skill** in v1. The fill
> route uses all **26 layouts** on **`templates/report.master.pptx`**. Read
> **`layout-catalogue.json`** (D16/D22) to pick layouts and fill slots. **Prefer
> `common` tier layouts; justify any `less-common` choice.** Charts: **data-swap
> only** (D21) — each layout pins its chart `kind`; supply data, never geometry.
> DOCX deliverables and dynamic chart build remain post-v1.

## 0. Purpose

Produce an **Acme project-delivery `.pptx`** — slides shown to the client during
or at the end of an engagement. The CLI fills any of the **26 real layouts** on
**`templates/report.master.pptx`**, guided by the Layout catalogue.

## 1. Hard rules

- You never lay out slides, pick coordinates, choose fonts or colours.
- You **read `layout-catalogue.json`** to pick a `layoutId` and fill only the
  catalogue's slot keys. **Fill-plan keys drop the `slot.` prefix** — e.g.
  catalogue `slot.title` → fill-plan `"title"`, `slot.body-left` →
  `"body-left"`. **Prefer `common` tier;** if you pick `less-common`, state why
  in your reasoning.
- Aim for each region's **optimal** density in the catalogue's `caps` (the CLI
  soft-warns when you exceed optimal but stay within max — exit 0); **max** is
  the hard ceiling Zod rejects.
- **Chart type is not your choice.** Each layout pins its `chart` slot to one
  literal `kind` (D21). Supply **data** (`datasetRef` or inline `dataset`) only.
- If you are missing information for a required slot, ask one short question.
  Never invent client-specific content.
- If the CLI returns a validation error, surface it **verbatim** — do not silently
  "fix" the fill-plan.

## 2. Read first

1. **`layout-catalogue.json`** — all 26 `layoutId`s, tiers, usage notes,
   per-slot `regions` maps, and density `caps`.
2. `docs/SLIDE_LAYOUT_LIBRARY.md` — naming convention and density-cap model.
3. `CHART_CATALOGUE.md` — pinned chart kinds per layout and dataset shape.
4. `src/schema/index.ts` — `fillPlanSchema` envelope (layout schemas are the
   per-`layoutId` contracts).
5. `src/brand/brand.yaml` — brand tokens (do not override layout or chart type).
6. `fixtures/valid-real-multi-layout-plan.json` — multi-layout worked example.

## 3. Two drivers (same fill-plan, same CLI)

### Driver A — BYO LLM (this skill)

You gather the brief, author a schema-valid fill-plan JSON, write it to a temp
file (or pipe via stdin), and invoke the CLI. **No LLM API call lives in the app**
(D11/D15) — you are the LLM.

### Driver B — Human runs the CLI directly

A consultant (or you) may skip the LLM step and run the CLI on an already-valid
fill-plan — e.g. `fixtures/valid-real-multi-layout-plan.json` or a hand-edited
plan. The CLI path is identical; only who authors the JSON differs.

Both drivers must produce the same result: a brand-correct `.pptx` with named
shapes filled and native editable charts carrying the fill-plan data.

## 4. Workflow (BYO LLM)

### Step A — Gather the brief

For a delivery deck, ask for:

- **Client name & meeting type** (steering committee? final readout? internal
  review?).
- **Deck structure** — cover, section breaks, key slides (charts, comparisons,
  narratives).
- **Headline findings** — action titles (8–15 words each).
- **Chart data** — datasets for each chart layout you plan to use.
- **Narrative content** — bullets, callouts, and source citations per slide.
- **Audience** and **date of the meeting**.

### Step B — Produce the fill-plan

Build a JSON matching `fillPlanSchema`:

- `kind` = `"deck"`
- `meta.templateId` = `"report.master.pptx"` (logical id — always this string).
- `meta.client`, `meta.date`, `meta.language` as standard.
- `sections[]` — each `{ title, slides: [...] }`. Each slide uses a `layoutId`
  from the catalogue; fill only keys that layout's slots (see `regions`).
- **Fill-plan key rule:** the JSON key is the catalogue region key **without**
  the `slot.` prefix (`slot.title` → `"title"`, `slot.chart-title` →
  `"chart-title"`, etc.). The schema is `.strict()` — do not emit `slot.*`
  keys.
- `datasets` — keyed datasets referenced by `chart.datasetRef`.

**Layout selection (D16):**

1. Open `layout-catalogue.json`.
2. Match the slide's purpose to a layout's `usage` note.
3. Prefer `tier: "common"`; use `less-common` only when the common set lacks a fit
   (e.g. white-background cover, high-contrast variant).
4. Fill every non-footer slot listed in `regions`, using the **un-prefixed**
   fill-plan key for each (`slot.foo` → `"foo"`).

**Chart block (data-swap — D21):**

```jsonc
{
  "kind": "stacked-column",        // must match the layout's pinned kind exactly
  "datasetRef": "my_dataset_key",  // OR inline "dataset": { ... }
  "caption": "optional ≤ 120 chars (optimal; hard max 200)"
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

During local dev from the repo (the working contract today):

```bash
pnpm run fill -- fill \
  --template templates/report.master.pptx \
  --plan tmp/jayson-docs-fillplan-<timestamp>.json \
  --out out/<client-shortname>-deck.pptx
```

(`pnpm run fill -- fill …` — note `fill` twice: once for pnpm, once for the CLI.)
Alternatively: `npx tsx src/cli/generate.ts fill --template … --plan … --out …`.

**Future bundled binary (D14 — not shipped yet):** when the skills pack ships a
signed `./jayson-docs` binary, invoke it by relative path:

```bash
./jayson-docs fill \
  --template templates/report.master.pptx \
  --plan tmp/jayson-docs-fillplan-<timestamp>.json \
  --out out/<client-shortname>-deck.pptx
```

Do **not** use `npx jayson-docs` today — the package is private, unpublished,
and has no `bin` entry.

**Stdin** (no temp file):

```bash
pnpm run fill -- fill \
  --template templates/report.master.pptx \
  --plan - \
  --out out/<client-shortname>-deck.pptx < tmp/jayson-docs-fillplan-<timestamp>.json
```

`--template` and `--out` extensions must match (both `.pptx`).

### Step E — Surface the result

Return the output path, a one-line summary, and "open in PowerPoint to edit."
Flag any data the consultant still needs to supply.

## 5. Human-run CLI (Driver B)

When the fill-plan already exists (hand-authored, exported, or from
`fixtures/valid-real-multi-layout-plan.json`):

```bash
pnpm run fill -- fill \
  --template templates/report.master.pptx \
  --plan fixtures/valid-real-multi-layout-plan.json \
  --out out/teg-steering-deck.pptx
```

See `fixtures/worked-example-brief.md` for a representative brief and what to
verify in the output `.pptx`.

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

- **Master template missing** (`templates/report.master.pptx`): tell the
  consultant; do not proceed.
- **Schema validation failure**: surface the Zod error verbatim; fix once, re-run;
  then ask.
- **Chart kind mismatch**: each layout's `chart.kind` must match its pinned
  literal exactly (e.g. `chart-stacked-column` → `"stacked-column"`) — you
  cannot substitute another chart type.
- **Bad `datasetRef`**: must resolve to a key in the fill-plan's `datasets` map.
- **Unknown layout**: only `layoutId`s in the catalogue are valid.
- **Unknown keys**: fill-plan objects are `.strict()` — extra keys are rejected.
