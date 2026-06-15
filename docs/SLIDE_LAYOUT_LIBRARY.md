# Slide Layout Library — Spec for the Master `.pptx`

**For:** the person designing the master `.pptx` in PowerPoint + the developer authoring the Zod schema
**Date:** 2026-06-03

> **Status (D22):** the six *seed-layout sketches* below were **superseded** by the firm's real sanitized `templates/report.master.pptx` — **26 layouts**, named and schema'd via the one-time Setup (see `docs/DECISIONS_LOG.md` D22, `src/setup/layout-spec.json`, `skills/report-pptx/layout-catalogue.json`). The naming convention, reserved structural slots, density-cap model (D23), and "master is canonical" rules in this file **remain authoritative**; only the specific seed-layout inventory is historical. **Phase 5 complete:** all 26 layouts fill via the CLI; DOCX and dynamic chart build remain post-v1 (D20/D21).

---

## Why this file exists

The architecture's consistency guarantee depends on the master template being designed with a **closed library of named layouts**, each with **named shapes** the LLM can fill. This file specifies what to design in PowerPoint and how to name everything so the Zod schema can mirror it.

---

## How layouts are defined — the master is canonical (not a grid)

A layout is defined by the **named shapes in the master template, at their actual positions**. The firm's real `.pptx` is canonical — for **geometry** as much as for colours and fonts (D2-2, **D19**). Layouts are **not** snapped to a design grid: real consulting templates rarely align to a 12×8 grid, and forcing them to would betray the firm's own design. Setup (D13) learns layouts from the firm's real decks **as-is**.

**Reserved structural slots** (present on every content slide; the LLM does not pick them): `tracker` (section breadcrumb, optional), `title` (action title, 8–15 words), `footer` (brand mark · page number · confidentiality). These are *roles*, not grid rows.

For the LLM's benefit, each layout carries a **`regions` map** in the Layout catalogue (D16) — a *descriptive* account of where each slot sits ("title top; chart left; narrative right"), derived from the master geometry — so the LLM fills content that fits its neighbours. That is positional **awareness**, not grid coordinates, and never spatial control (D8).

> The **12×8 grid** survives **only** as the concept behind the **deferred flexgrid** roadmap option (D12), where it *would* become a runtime placement system — it is **not** a v1 layout-design discipline. The seed-layout sketches below describe slot *roles* and rough neighbourhood only; exact geometry lives in the master's named shapes.

---

## Initial layouts (v1)

These six are the **v1 walking-skeleton seed**. A mature install holds **~50–100** layouts covering most slide types, each annotated in the **Layout catalogue** — `tier` (Usage tier `common`/`less-common`/`rare`), a `usage` note ("pick when…"), a `regions` spatial map, and density `caps` — so the LLM can **pick** among them (*prefer common, justify rare*) and **fill** them coherently. Add layouts by repeating this pattern *and* adding a catalogue entry. See `DECISIONS_LOG.md` D16.

Each seed layout lists its slots top-to-bottom. Horizontal splits are noted where relevant. Exact positions and proportions come from the master template — not from this sketch.

### 1. `kpi-row-chart` — KPI strip above, chart with narrative side

- `tracker` (full width, top; optional)
- `title` (full width)
- `kpi-strip` (full width band)
- `chart` (left) | `narrative` (right)
- `footer` (auto)

Slots: `title`, `kpi-strip`, `chart`, `narrative`, `footer` (auto).

### 2. `two-column` — body split left / right

- `tracker` (full width, top; optional)
- `title` (full width)
- `body-left` (left) | `body-right` (right) — both kind: `content`
- `footer` (auto)

Slots: `title`, `body-left`, `body-right`, `footer` (auto).

### 3. `chart-full-with-takeaway` — punchline above a wide chart

- `tracker` (full width, top; optional)
- `title` (full width)
- `takeaway` (full width; single-line callout)
- `chart-full` (full width)
- `footer` (auto)

Slots: `title`, `takeaway`, `chart-full`, `footer` (auto).

### 4. `bullets-and-image` — text left, supporting visual right

- `tracker` (full width, top; optional)
- `title` (full width)
- `body-text` (left) | `visual` (right)
- `footer` (auto)

Slots: `title`, `body-text`, `visual`, `footer` (auto).

### 5. `quad` — four quadrants for matrix / comparison

- `tracker` (full width, top; optional)
- `title` (full width)
- `q-tl` (top-left) | `q-tr` (top-right)
- `q-bl` (bottom-left) | `q-br` (bottom-right)
- `footer` (auto)

Slots: `title`, `q-tl`, `q-tr`, `q-bl`, `q-br`, `footer` (auto).

### 6. `section-divider` — chapter break

- `section-title` (large centred text; dominates the slide)
- No tracker, no standard title row, no footer (or large brand variant)

Slots: `section-title`.

---

## Region kind → block type compatibility

The Zod schema enforces this table. The LLM cannot put an `image` block in a `chart` region or vice versa.

| Region kind | Accepts block types |
|---|---|
| `title` | `title` (8–15 words) |
| `tracker` | `tracker` (auto-derived from section structure) |
| `footer` | `footer` (auto-applied from brand) |
| `kpi-strip` | `kpi-cards` (3–5 cards: figure + label + optional delta) |
| `chart` | `chart` (PowerPoint-native, type from approved set) |
| `narrative` | `bullets` (≤5 items, ≤60 words total) **or** `text` (≤60 words) |
| `content` | `bullets`, `text`, `chart`, `callout`, `image` |
| `callout` / `takeaway` | `callout` (≤25 words) |
| `image` / `visual` | `image` (with optional caption) |
| `section-title` | `section-title` (large divider text, ≤8 words) |

**Chart kinds in v1 (D21):** only kinds **pinned by a layout slot** and **pre-authored in the master** count. The 26-layout `report.master.pptx` pins `stacked-column`, `clustered-column`, `line`, and `bubble` on their respective chart layouts. The full kind list in `CHART_CATALOGUE.md` is a **reference catalogue** for when additional layouts/masters add more pinned slots — not a user-selectable menu. Dynamic chart build (PptxGenJS) and DOCX charts remain post-v1.

---

## Shape naming convention in PowerPoint

When designing the master `.pptx`, every fillable shape **must** be named via PowerPoint's Selection Pane (Home → Arrange → Selection Pane). The naming convention:

```
slot.<slotName>                       e.g. slot.title, slot.chart, slot.narrative
slot.<slotName>.<subElement>          e.g. slot.kpi-strip.card1.figure
                                            slot.kpi-strip.card1.label
                                            slot.kpi-strip.card1.delta
                                            slot.bullets.item1
                                            slot.image.caption
```

For chart shapes:

- If the chart **type** in the output always matches the template placeholder (e.g. always a bar chart on this layout), use the placeholder chart and let pptx-automizer swap the data only.
- If the chart **type varies** with the data (this slide may show waterfall, bar, or stacked-bar depending on input), use a generic chart shape named `slot.chart` and the pipeline will replace the entire chart object via PptxGenJS at fill time.

The Zod schema mirrors these names exactly. The LLM emits keys matching the schema, never raw PowerPoint shape names.

---

## Sample filled slide (LLM output)

```json
{
  "type": "slide",
  "layoutId": "kpi-row-chart",
  "title": "Tier-1 candidates score 2× ammonia on bankable demand",
  "kpi-strip": [
    { "figure": "2.4×",   "label": "demand vs ammonia",    "delta": "+140%" },
    { "figure": "€68/MWh","label": "LCOE target",          "delta": "-12%"  },
    { "figure": "7",      "label": "credible offtakers",   "delta": null   }
  ],
  "chart": {
    "kind": "stacked-bar",
    "datasetRef": "tier1_demand_2032"
  },
  "narrative": {
    "kind": "bullets",
    "items": [
      "Three industries clear the bankability gate in all scenarios.",
      "Ammonia trails on counterparty diversity, not on LCOE.",
      "Final selection in Module 2."
    ]
  }
}
```

---

## Adding a new layout

1. Design the new slide on the master `.pptx` in PowerPoint.
2. Name every fillable shape per the convention above.
3. Add a new entry to the `layoutId` enum in the Zod schema.
4. Add per-slot type definitions and density caps.
5. Add a fixture fill-plan that uses the new layout; verify the pipeline output in PowerPoint.

**This is design + schema work, ~30 minutes per layout.** It is *not* a runtime LLM capability — the LLM cannot invent a layout that does not exist in the enum.

---

## Density caps — three tiers (fill-band, optimal warned, max enforced)

Each text region carries up to **three** density signals. The LLM-facing catalogue (`skills/report-pptx/layout-catalogue.json`) mirrors the schema caps and emits per-box **fill-bands** (D26).

### Tier 1 — Comfortable-fill band (D26; per box, layout selection)

A **comfortable-fill band** is a two-sided target (`lower..upper`) keyed by **(layout, slot, cap-kind)** — not by region kind alone. Setup derives it from each box's real geometry in `src/setup/layout-spec.json` (`x/y/w/h` in inches, D19) and its effective font size (master-canonical; never chosen at runtime). The deriver emits bands into the catalogue's `fillBands` map; `src/schema/caps.ts` holds only the `ComfortableFillBand` type.

**Eligible cap-kinds** (multi-line body/content only): `content-text`, `content-bullets`, `content-callout`. **Excluded:** heading/label kinds (`title`, `section-title`, `subtitle`, `chart-title`, `source`, `cover-body`) and non-text kinds (`chart`, `image`, `footer`) — headings are intentionally sparse in large boxes.

Each band entry looks like:

```json
"fillBands": {
  "slot.body-left": {
    "content-text": { "unit": "words", "lower": 60, "upper": 100 },
    "content-bullets": { "unit": "items", "lower": 5, "upper": 8 }
  }
}
```

The `report-pptx` skill instructs the BYO LLM to **match content volume to a layout's fill-band** when picking among layouts — this is how "how much text fits in this box?" is answered without ever letting the LLM choose a font size.

**Note (T-201):** for boxes whose physical capacity exceeds the kind's D23 cap, the band equals D23 `[optimal … max]` — true for all 26 current layouts' body boxes, so bands look uniform today. Bands **differentiate** (sub-cap targets) for smaller boxes — the D27 archetype cells (matrix/process/KPI/feature-grid/sub-slots), where per-box fill guidance matters. Uniform bands on today's catalogue are expected, not a bug.

The CLI emits two-sided soft-warnings (exit 0, stderr) when content falls **below `lower` or above `upper`** — distinct from D23's per-kind hard `max` (Zod reject, exit 2). Where a D26 per-box band exists, it **supersedes** D23's footprint-blind `optimal` warning (at most one density warning per region).

### Tier 2 — Optimal (CLI-warned, per region kind)

Each text region kind carries an **optimal** range (`src/schema/caps.ts` is the single source, mirrored by the catalogue's top-level `caps` per D22's drift test). The CLI soft-warns when exceeded (exits 0, stderr note). Aim for optimal when authoring; where a D26 band applies, prefer fitting the band instead.

| Region | Optimal (CLI-warned) | Max (Zod-enforced) |
|--------|----------------------|--------------------|
| `title` | 8–15 words | 20 words |
| `section-title` | ≤8 words | 12 words |
| `subtitle` | ≤25 words | 40 words |
| `chart-title` | ≤15 words | 25 words |
| `source` | ≤40 words | 80 words |
| cover `body` | ≤25 words | 40 words |
| `narrative` / content bullets | ≤5 items, ≤60 words | ≤8 items, ≤100 words |
| content `text` | ≤60 words | 100 words |
| `callout` / `takeaway` | ≤25 words | 40 words |
| `caption` (image / chart) | ≤120 chars | 200 chars |

Structural hard limits (single bound): general `bullets` block ≤7 items; pie/doughnut chart rows ≤8; `kpi-strip` holds 3–5 cards.

### Tier 3 — Max (Zod-enforced, per region kind)

An **absolute max** that Zod **rejects**. The max is the hard ceiling that keeps the master geometry from breaking (D19, D23).

Over **optimal** → soft warning (CLI exits 0), unless a D26 band supersedes it for that region. Over **max** → rejected with a clear error, whether the LLM or a human produced it — never auto-truncated or "fixed" (`ERROR_HANDLING.md`).
