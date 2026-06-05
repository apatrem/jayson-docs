# Slide Layout Library — Spec for the Master `.pptx`

**For:** the person designing the master `.pptx` in PowerPoint + the developer authoring the Zod schema
**Date:** 2026-06-03

---

## Why this file exists

The architecture's consistency guarantee depends on the master template being designed with a **closed library of named layouts**, each with **named shapes** the LLM can fill. This file specifies what to design in PowerPoint and how to name everything so the Zod schema can mirror it.

---

## How layouts are defined — the master is canonical (not a grid)

A layout is defined by the **named shapes in the master template, at their actual positions**. The firm's real `.pptx` is canonical — for **geometry** as much as for colours and fonts (D2-2, **D19**). Layouts are **not** snapped to a design grid: real consulting templates rarely align to a 12×8 grid, and forcing them to would betray the firm's own design. Setup (D13) learns layouts from the firm's real decks **as-is**.

**Reserved structural slots** (present on every content slide; the LLM does not pick them): `tracker` (section breadcrumb, optional), `title` (action title, 8–15 words), `footer` (brand mark · page number · confidentiality). These are *roles*, not grid rows.

For the LLM's benefit, each layout carries a **`regions` map** in the Layout catalogue (D16) — a *descriptive* account of where each slot sits ("title top; chart left; narrative right"), derived from the master geometry — so the LLM fills content that fits its neighbours. That is positional **awareness**, not grid coordinates, and never spatial control (D8).

> The **12×8 grid** survives **only** as the concept behind the **deferred flexgrid** roadmap option (D12), where it *would* become a runtime placement system — it is **not** a v1 layout-design discipline. The grid-like ASCII in the seed-layout sketches below is purely *illustrative* of the six v1 seeds; the canonical definition is always the master's named shapes.

---

## Initial layouts (v1)

These six are the **v1 walking-skeleton seed**. A mature install holds **~50–100** layouts covering most slide types, each annotated in the **Layout catalogue** — `tier` (Usage tier `common`/`less-common`/`rare`), a `usage` note ("pick when…"), a `regions` spatial map, and density `caps` — so the LLM can **pick** among them (*prefer common, justify rare*) and **fill** them coherently. Add layouts by repeating this pattern *and* adding a catalogue entry. See `DECISIONS_LOG.md` D16.

### 1. `kpi-row-chart` — KPI strip above, chart with narrative side

```
"tk tk tk tk tk tk tk tk tk tk tk tk"   row 1 — tracker
"tl tl tl tl tl tl tl tl tl tl tl tl"   row 2 — title
"kp kp kp kp kp kp kp kp kp kp kp kp"   row 3 — kpi-strip
"kp kp kp kp kp kp kp kp kp kp kp kp"   row 4 — kpi-strip
"ch ch ch ch ch ch ch ch nr nr nr nr"   row 5 — chart | narrative
"ch ch ch ch ch ch ch ch nr nr nr nr"   row 6
"ch ch ch ch ch ch ch ch nr nr nr nr"   row 7
"ft ft ft ft ft ft ft ft ft ft ft ft"   row 8 — footer
```

Slots: `title`, `kpi-strip`, `chart`, `narrative`, `footer` (auto).

### 2. `two-column` — body split 6 / 6

Rows 3–7, cols 1–6 = `body-left`; rows 3–7, cols 7–12 = `body-right`. Both kind: `content`.

Slots: `title`, `body-left`, `body-right`, `footer` (auto).

### 3. `chart-full-with-takeaway` — punchline above a wide chart

Row 3, cols 1–12 = `takeaway` (single-line callout). Rows 4–7, cols 1–12 = `chart-full`.

Slots: `title`, `takeaway`, `chart-full`, `footer` (auto).

### 4. `bullets-and-image` — text left, supporting visual right

Rows 3–7, cols 1–7 = `body-text`. Cols 8–12 = `visual`.

Slots: `title`, `body-text`, `visual`, `footer` (auto).

### 5. `quad` — four quadrants for matrix / comparison

Rows 3–5, cols 1–6 = `q-tl`. Rows 3–5, cols 7–12 = `q-tr`. Rows 6–7, cols 1–6 = `q-bl`. Rows 6–7, cols 7–12 = `q-br`.

Slots: `title`, `q-tl`, `q-tr`, `q-bl`, `q-br`, `footer` (auto).

### 6. `section-divider` — chapter break

Rows 3–6, cols 1–12 = `section-title` (large centred text). No tracker, no standard title row, no footer (or large brand variant).

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

Approved chart types for v1: `bar`, `stacked-bar`, `line`, `area`, `pie`, `doughnut`, `scatter`, `waterfall`. Add others only with deliberate approval.

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

## Density caps (enforced by Zod)

To prevent the LLM overfilling slots and visually breaking layouts:

- `title` — 8–15 words
- `section-title` — ≤8 words
- `kpi-strip` — 3–5 cards
- `narrative` / `body-text` bullets — ≤5 items, ≤60 words total
- `callout` / `takeaway` — ≤25 words
- `body-text` paragraph — ≤80 words
- general `bullets` — ≤7 items

Fill-plans that exceed these caps are rejected (whether the LLM or a human produced them), regardless of how plausibly the model phrased the content.
