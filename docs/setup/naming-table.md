# Proposed naming table — `report.master.pptx` (26 layouts)

> **STATUS: APPROVED — Phase 2 applies `slot.*` names mechanically from this table.**
> No `slot.*` names have been written into the `.pptx` yet. Phase 2 (human-gated) reviews this table, then a mechanical OOXML write renames shapes and a `shapes ≡ slots` validator runs.

Source: `templates/report.master.pptx` (sanitized firm template, 26 slides).
Extraction: OOXML from `ppt/slides/slideN.xml` + slide layout geometry/text fallback + chart part inspection.
**Disambiguation rule:** placeholder default text ("Click to edit title", "Click to edit subtitle", "Chart name, unit", "Source: 1.") takes precedence over raw PowerPoint placeholder types (`body` vs `subTitle`).

**Shape identity contract:** a master shape is matched and validated by **placeholder type+idx** and **geometry** (±0.05 in). The **Master placeholder text** column is a naming-time disambiguation hint only — not a validation invariant; do not enforce brittle boilerplate text after `slot.*` names are applied.

## Usage tiers (seeded from deck sections)

| Tier | Slides | Deck section |
|------|--------|--------------|
| `common` | 1–16 | "Very common slides" |
| `less-common` | 17–26 | "Less common slides" |

## Region kinds

### `subtitle`
Short supporting line under the action title or above a column. Accepts **`text`** and **`callout`**. Identified by master placeholder text "Click to edit subtitle" (or column header rows on multi-column layouts).

### `chart-title`
Chart-specific title / unit line above the chart area — **not** a slide subtitle. Identified by master text "Chart name, unit". Accepts block type **`text`** (chart name + unit string).

### `source`
Footer source-citation strip (middle of footer band). Identified by placeholder text "Source: 1." Accepts block type **`source`** — text citations with hyperlinks when available. **LLM-filled.**

### Footer band (three elements)

| Position | Shape | Proposed slot | Fillable | Notes |
|----------|-------|---------------|----------|-------|
| Left | `ACME_logo` | `slot.footer-logo` | No | Deterministic — brand logo from master |
| Centre | `idx:18` ("Source: 1.") | `slot.source` | **Yes** | LLM fills source citations (with hyperlinks when available) |
| Right | `sldNum` | `slot.footer-page` | No | Deterministic — pagination auto-applied by pipeline |

Some layouts also carry a `©Year Acme` copyright line (`slot.footer-copyright`, auto).

## Chart flag: `bubble` dataset shape

The `chart-bubble` layout (slide 10) pins a pre-authored **bubble** chart. Bubble charts require **x / y / size** triples per series — **not** the standard categories + numeric-series columns used by bar/line charts.

## Shared slot vocabularies

| Slot vocabulary group | `layoutId`s | Notes |
|-----------------------|-------------|-------|
| Cover family | `cover`, `cover-white` | `slot.title`, `slot.subtitle`, `slot.body`, `slot.image` |
| Section family | `section`, `section-white` | `slot.section-title`, `slot.subtitle` |
| Agenda family | `agenda`, `agenda-white` | `slot.title`, `slot.body-left` |
| Chart + narrative | `chart-*` (slides 7–10) | `slot.title`, `slot.chart-title`, `slot.chart`, `slot.body-right` + footer trio |
| Two-column | `two-columns` | `slot.title`, `slot.body-left`, `slot.body-right` |
| Two-column + subheads | `two-columns-and-subtitles`, `two-column-with-subheads( -hc)` | Adds `slot.subtitle-left`, `slot.subtitle-right` |
| Three-column + subheads | `three-columns-and-subtitles` | `slot.subtitle-left`, `slot.subtitle-middle`, `slot.subtitle-right` + three body columns |
| Sidebar callout | `sidebar-callout`, `sidebar-callout-inverse`, `sidebar-callout-hc`, `sidebar-callout-hc-inverse` | Identical `slot.*` set on all four — differ only in background brand fill (distinct master slides per D19). |
| Narrative + sidebar | `narrative-with-sidebar( -hc)` | `slot.title`, `slot.subtitle-left`, `slot.body-left`, `slot.subtitle-right`, `slot.body-right` |

---

## Tier: `common`

### Slide 1 — `cover`

| Field | Value |
|-------|-------|
| Firm layout name | Cover |
| Proposed `layoutId` | `cover` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Espace réservé pour une image  1 | pic | Client logo | x=10.923 y=0.083 w=2.123 h=1.068 | slot.image | image | — |
| Titre 2 | ctrTitle | Click to edit title | x=0.600 y=1.497 w=8.114 h=1.353 | slot.title | title | — |
| Sous-titre 3 | subTitle | Click to edit subtitle | x=0.600 y=2.943 w=8.114 h=0.571 | slot.subtitle | subtitle | — |
| Espace réservé du texte 4 | body | Edit date or title/role | x=0.600 y=3.855 w=4.389 h=0.446 | slot.body | content | — |

### Slide 2 — `section`

| Field | Value |
|-------|-------|
| Firm layout name | Section |
| Proposed `layoutId` | `section` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | ctrTitle | Click to edit title | x=0.602 y=1.225 w=7.953 h=2.611 | slot.section-title | section-title | — |
| Sous-titre 2 | subTitle | Click to edit subtitle | x=0.602 y=3.929 w=7.953 h=0.571 | slot.subtitle | subtitle | — |

### Slide 3 — `agenda`

| Field | Value |
|-------|-------|
| Firm layout name | Agenda |
| Proposed `layoutId` | `agenda` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Contents/Agenda – click to edit | x=0.608 y=0.365 w=12.123 h=0.708 | slot.title | title | — |
| Espace réservé du contenu 2 | idx:2 | Click to edit agenda Level 2 Level 3 Lev | x=0.602 y=2.175 w=9.057 h=4.686 | slot.body-left | content | — |
| Espace réservé du numéro de diapositive 3 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 11 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 4 — `title`

| Field | Value |
|-------|-------|
| Firm layout name | Title |
| Proposed `layoutId` | `title` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit Master title style | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du contenu 2 | idx:1 | Click to edit Master text styles Second  | x=0.602 y=1.231 w=12.128 h=5.590 | slot.body-left | content | — |
| Espace réservé du numéro de diapositive 3 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 4 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 7 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 5 — `title-only`

| Field | Value |
|-------|-------|
| Firm layout name | Title only |
| Proposed `layoutId` | `title-only` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 4 | title | Click to edit Master title style | — | slot.title | title | — |
| Espace réservé du contenu 5 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| Espace réservé du numéro de diapositive 3 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 4 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 6 — `title-and-subtitle`

| Field | Value |
|-------|-------|
| Firm layout name | Title and subtitle |
| Proposed `layoutId` | `title-and-subtitle` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 4 | title | Click to edit Master title style | x=0.602 y=0.382 w=12.167 h=0.691 | slot.title | title | — |
| Espace réservé du contenu 5 | idx:1 | Click to edit Master text styles Second  | x=0.602 y=1.655 w=12.128 h=5.166 | slot.body-left | content | — |
| Sous-titre 7 | subTitle | Click to edit master subtitle style | x=0.617 y=1.239 w=12.164 h=0.228 | slot.subtitle | subtitle | — |
| Espace réservé du numéro de diapositive 3 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 5 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 7 — `chart-stacked-column`

| Field | Value |
|-------|-------|
| Firm layout name | Title |
| Proposed `layoutId` | `chart-stacked-column` |
| Naming rationale | Disambiguated by pre-authored stacked-column chart (slide 7). |
| Usage tier | `common` |
| Pinned chart kind | `stacked-column` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 10 | title | Click to edit Master title style | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du numéro de diapositive 3 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 11 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| Espace réservé du contenu 5 | — | Comment | x=7.527 y=1.775 w=5.254 h=4.865 | slot.body-right | content | Narrative beside chart |
| Espace réservé du contenu 5 | — | Chart name , unit | x=0.602 y=1.318 w=6.164 h=0.301 | slot.chart-title | chart-title | Chart title / unit line above chart (not slide subtitle) |
| Espace réservé du contenu 1 | idx:1 | — | x=0.602 y=1.775 w=6.472 h=5.047 | slot.chart | chart | chart kind: stacked-column |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 7 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 8 — `chart-clustered-column`

| Field | Value |
|-------|-------|
| Firm layout name | Title |
| Proposed `layoutId` | `chart-clustered-column` |
| Naming rationale | Disambiguated by pre-authored clustered-column chart (slide 8). |
| Usage tier | `common` |
| Pinned chart kind | `clustered-column` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 10 | title | Click to edit Master title style | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du numéro de diapositive 3 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 11 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| Espace réservé du contenu 5 | — | Comment | x=7.527 y=1.775 w=5.254 h=4.865 | slot.body-right | content | Narrative beside chart |
| Espace réservé du contenu 5 | — | Chart name , unit | x=0.602 y=1.318 w=6.164 h=0.301 | slot.chart-title | chart-title | Chart title / unit line above chart (not slide subtitle) |
| Espace réservé du contenu 1 | idx:1 | — | x=0.602 y=1.775 w=6.491 h=5.047 | slot.chart | chart | chart kind: clustered-column |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 7 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 9 — `chart-line`

| Field | Value |
|-------|-------|
| Firm layout name | Title |
| Proposed `layoutId` | `chart-line` |
| Naming rationale | Disambiguated by pre-authored line chart (slide 9). |
| Usage tier | `common` |
| Pinned chart kind | `line` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 10 | title | Click to edit Master title style | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du numéro de diapositive 3 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 11 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| Espace réservé du contenu 5 | — | Comment | x=7.527 y=1.775 w=5.254 h=4.865 | slot.body-right | content | Narrative beside chart |
| Espace réservé du contenu 5 | — | Chart name , unit | x=0.602 y=1.318 w=6.164 h=0.301 | slot.chart-title | chart-title | Chart title / unit line above chart (not slide subtitle) |
| Espace réservé du contenu 1 | idx:1 | — | x=0.602 y=1.775 w=6.248 h=5.047 | slot.chart | chart | chart kind: line |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 7 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 10 — `chart-bubble`

| Field | Value |
|-------|-------|
| Firm layout name | Title |
| Proposed `layoutId` | `chart-bubble` |
| Naming rationale | Disambiguated by pre-authored bubble chart (slide 10). |
| Usage tier | `common` |
| Pinned chart kind | `bubble` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 10 | title | Click to edit Master title style | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du numéro de diapositive 3 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 11 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| Espace réservé du contenu 5 | — | Comment | x=7.527 y=1.775 w=5.254 h=4.865 | slot.body-right | content | Narrative beside chart |
| Espace réservé du contenu 5 | — | Chart name , unit | x=0.602 y=1.318 w=6.164 h=0.301 | slot.chart-title | chart-title | Chart title / unit line above chart (not slide subtitle) |
| Espace réservé du contenu 1 | idx:1 | — | x=0.602 y=1.775 w=6.192 h=5.047 | slot.chart | chart | chart kind: bubble |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 7 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 11 — `two-columns`

| Field | Value |
|-------|-------|
| Firm layout name | Two columns |
| Proposed `layoutId` | `two-columns` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 5 | title | Click to edit Master title style | — | slot.title | title | — |
| Espace réservé du contenu 6 | idx:1 | Click to edit Master text styles Second  | x=0.602 y=1.231 w=5.906 h=5.592 | slot.body-left | content | — |
| Espace réservé du contenu 7 | idx:2 | Click to edit Master text styles Second  | x=6.825 y=1.231 w=5.906 h=5.592 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 3 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 8 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 6 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 12 — `narrative-with-sidebar`

| Field | Value |
|-------|-------|
| Firm layout name | Contrast 1 |
| Proposed `layoutId` | `narrative-with-sidebar` |
| Naming rationale | Wide left narrative + narrow right accent — role-semantic name for "Contrast 1". |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit title | x=0.602 y=0.382 w=9.052 h=0.691 | slot.title | title | — |
| Espace réservé du texte 2 | body | Click to edit subtitle | x=0.602 y=1.249 w=9.057 h=0.218 | slot.subtitle-left | subtitle | — |
| Espace réservé du contenu 3 | idx:2 | Click to edit Master text styles Second  | x=0.602 y=1.746 w=9.057 h=5.075 | slot.body-left | content | — |
| Espace réservé du texte 4 | body | Click to edit subtitle | x=10.053 y=1.249 w=2.678 h=0.225 | slot.subtitle-right | subtitle | — |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=10.053 y=1.746 w=2.678 h=5.075 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 6 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — slide instance (idx 12) |
| Espace réservé du contenu 7 | idx:18 | Source: 1. | x=1.350 y=7.185 w=8.304 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 8 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 13 — `two-column-with-subheads`

| Field | Value |
|-------|-------|
| Firm layout name | Contrast 2 |
| Proposed `layoutId` | `two-column-with-subheads` |
| Naming rationale | Equal two-column split with subtitle row per column — role-semantic name for "Contrast 2". |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit title | x=0.602 y=0.382 w=5.901 h=0.691 | slot.title | title | — |
| Espace réservé du texte 2 | body | Click to edit subtitle | x=0.602 y=1.237 w=5.906 h=0.230 | slot.subtitle-left | subtitle | — |
| Espace réservé du contenu 3 | idx:2 | Click to edit Master text styles Second  | x=0.602 y=1.735 w=5.906 h=5.086 | slot.body-left | content | — |
| Espace réservé du texte 4 | body | Click to edit subtitle | x=6.825 y=1.239 w=5.906 h=0.228 | slot.subtitle-right | subtitle | — |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=6.825 y=1.735 w=5.906 h=5.086 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 6 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — slide instance (idx 12) |
| Espace réservé du contenu 7 | idx:18 | Source: 1. | x=1.350 y=7.185 w=5.153 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 7 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 14 — `sidebar-callout`

| Field | Value |
|-------|-------|
| Firm layout name | Contrast 4 |
| Proposed `layoutId` | `sidebar-callout` |
| Naming rationale | Left sidebar title + two subtitles + right content — role-semantic name for "Contrast 4". |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit title | x=0.608 y=2.886 w=2.673 h=0.991 | slot.title | title | — |
| Espace réservé du texte 2 | body | Click to edit subtitle | x=0.602 y=4.163 w=2.673 h=0.374 | slot.subtitle-1 | subtitle | Sidebar subtitle 1 (left stack) |
| Espace réservé du texte 3 | body | Click to edit subtitle | x=3.888 y=0.994 w=8.843 h=0.237 | slot.subtitle-2 | subtitle | Subtitle 2 above main content pane (slide instance; idx 3) |
| Espace réservé du contenu 4 | idx:4 | Click to edit Master text styles Second  | x=3.888 y=1.467 w=8.853 h=5.354 | slot.body | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=3.878 y=7.185 w=6.884 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 8 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 15 — `three-columns-and-subtitles`

| Field | Value |
|-------|-------|
| Firm layout name | Three columns and subtitles |
| Proposed `layoutId` | `three-columns-and-subtitles` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit Master title style | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du texte 2 | body | Click to edit master text styles | x=0.602 y=1.231 w=3.780 h=0.236 | slot.subtitle-left | subtitle | — |
| Espace réservé du contenu 3 | idx:2 | Click to edit Master text styles Second  | x=0.602 y=1.663 w=3.780 h=5.158 | slot.body-left | content | — |
| Espace réservé du texte 4 | body | Click to edit master text styles | x=8.950 y=1.231 w=3.781 h=0.231 | slot.subtitle-right | subtitle | — |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=8.950 y=1.663 w=3.781 h=5.158 | slot.body-right | content | — |
| Espace réservé du texte 6 | body | Click to edit master text styles | x=4.737 y=1.231 w=3.859 h=0.236 | slot.subtitle-middle | subtitle | — |
| Espace réservé du contenu 7 | idx:20 | Click to edit Master text styles Second  | x=4.737 y=1.663 w=3.859 h=5.158 | slot.body-center | content | — |
| Espace réservé du numéro de diapositive 8 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — slide instance (idx 12) |
| Espace réservé du contenu 9 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 8 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 16 — `title-and-content`

| Field | Value |
|-------|-------|
| Firm layout name | Title and Content |
| Proposed `layoutId` | `title-and-content` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit Master title style | — | slot.title | title | — |
| Espace réservé du contenu 2 | idx:1 | Click to edit Master text styles Second  | — | slot.body-left | content | — |
| Espace réservé du numéro de diapositive 3 | sldNum | ‹N°› | — | slot.footer-page | footer | Pagination — pipeline auto-applies |

## Tier: `less-common`

### Slide 17 — `two-columns-and-subtitles`

| Field | Value |
|-------|-------|
| Firm layout name | Two columns and subtitles |
| Proposed `layoutId` | `two-columns-and-subtitles` |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit Master title style | x=0.602 y=0.382 w=12.128 h=0.691 | slot.title | title | — |
| Espace réservé du texte 2 | body | Click to edit master text styles | x=0.602 y=1.231 w=5.906 h=0.236 | slot.subtitle-left | subtitle | — |
| Espace réservé du contenu 3 | idx:2 | Click to edit Master text styles Second  | x=0.602 y=1.663 w=5.906 h=5.158 | slot.body-left | content | — |
| Espace réservé du texte 4 | body | Click to edit master text styles | x=6.824 y=1.231 w=5.906 h=0.236 | slot.subtitle-right | subtitle | — |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=6.825 y=1.663 w=5.906 h=5.158 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 6 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — slide instance (idx 12) |
| Espace réservé du contenu 7 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 8 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 18 — `blank`

| Field | Value |
|-------|-------|
| Firm layout name | Blank |
| Proposed `layoutId` | `blank` |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Espace réservé du numéro de diapositive 1 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 2 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |

### Slide 19 — `cover-white`

| Field | Value |
|-------|-------|
| Firm layout name | Cover - white |
| Proposed `layoutId` | `cover-white` |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | ctrTitle | Click to edit title | x=0.600 y=1.497 w=9.601 h=1.353 | slot.title | title | — |
| Sous-titre 2 | subTitle | Click to edit subtitle | x=0.600 y=2.943 w=9.601 h=0.571 | slot.subtitle | subtitle | — |
| Espace réservé du texte 3 | body | Edit date or title/role | x=0.600 y=3.855 w=4.389 h=0.446 | slot.body | content | — |
| Espace réservé pour une image  4 | pic | Client logo | x=10.923 y=0.083 w=2.123 h=1.068 | slot.image | image | — |

### Slide 20 — `section-white`

| Field | Value |
|-------|-------|
| Firm layout name | Section - white |
| Proposed `layoutId` | `section-white` |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | ctrTitle | Click to edit title | x=0.602 y=1.251 w=7.953 h=2.611 | slot.section-title | section-title | — |
| Sous-titre 2 | subTitle | Click to edit subtitle | x=0.602 y=3.954 w=7.953 h=0.571 | slot.subtitle | subtitle | — |

### Slide 21 — `agenda-white`

| Field | Value |
|-------|-------|
| Firm layout name | Agenda - white |
| Proposed `layoutId` | `agenda-white` |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Contents/Agenda – click to edit | x=0.602 y=0.382 w=12.123 h=0.691 | slot.title | title | — |
| Espace réservé du numéro de diapositive 2 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 3 | idx:2 | Click to edit agenda | x=0.602 y=1.860 w=9.057 h=4.944 | slot.body-left | content | — |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 7 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 22 — `sidebar-callout-inverse`

| Field | Value |
|-------|-------|
| Firm layout name | Contrast 3 |
| Proposed `layoutId` | `sidebar-callout-inverse` |
| Naming rationale | Same geometry and slot vocabulary as Contrast 4 — inverted brand fill (white / light-green). |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit title | x=0.608 y=2.886 w=2.673 h=0.991 | slot.title | title | — |
| Espace réservé du texte 2 | body | Click to edit subtitle | x=0.602 y=4.163 w=2.673 h=0.374 | slot.subtitle-1 | subtitle | Sidebar subtitle 1 (left stack) |
| Espace réservé du texte 3 | body | Click to edit subtitle | x=3.888 y=0.994 w=8.843 h=0.237 | slot.subtitle-2 | subtitle | Subtitle 2 above main content pane (slide instance; idx 3) |
| Espace réservé du contenu 4 | idx:4 | Click to edit Master text styles Second  | x=3.888 y=1.467 w=8.853 h=5.354 | slot.body | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=3.878 y=7.185 w=6.884 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 6 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 23 — `narrative-with-sidebar-hc`

| Field | Value |
|-------|-------|
| Firm layout name | High contrast 1 |
| Proposed `layoutId` | `narrative-with-sidebar-hc` |
| Naming rationale | High-contrast styling of Contrast 1 geometry. |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit title | x=0.602 y=0.382 w=9.052 h=0.691 | slot.title | title | — |
| Espace réservé du texte 2 | body | Click to edit subtitle | x=0.602 y=1.231 w=9.057 h=0.243 | slot.subtitle-left | subtitle | — |
| Espace réservé du contenu 3 | idx:2 | Click to edit Master text styles Second  | x=0.602 y=1.703 w=9.057 h=5.139 | slot.body-left | content | — |
| Espace réservé du texte 4 | body | Click to edit subtitle | x=10.053 y=1.231 w=2.678 h=0.243 | slot.subtitle-right | subtitle | — |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=10.053 y=1.703 w=2.678 h=5.139 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 6 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — slide instance (idx 12) |
| Espace réservé du contenu 7 | idx:18 | Source: 1. | x=1.350 y=7.185 w=8.304 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 13 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 24 — `two-column-with-subheads-hc`

| Field | Value |
|-------|-------|
| Firm layout name | High contrast 2 |
| Proposed `layoutId` | `two-column-with-subheads-hc` |
| Naming rationale | High-contrast styling of Contrast 2 geometry. |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit title | x=0.602 y=0.382 w=5.901 h=0.708 | slot.title | title | — |
| Espace réservé du texte 2 | body | Click to edit subtitle | x=0.602 y=1.231 w=5.906 h=0.236 | slot.subtitle-left | subtitle | — |
| Espace réservé du contenu 3 | idx:2 | Click to edit Master text styles Second  | x=0.602 y=1.703 w=5.906 h=5.119 | slot.body-left | content | — |
| Espace réservé du texte 4 | body | Click to edit subtitle | x=6.825 y=1.236 w=5.906 h=0.275 | slot.subtitle-right | subtitle | — |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=6.825 y=1.703 w=5.906 h=5.138 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 6 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — slide instance (idx 12) |
| Espace réservé du contenu 7 | idx:18 | Source: 1. | x=1.350 y=7.185 w=5.153 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 11 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 25 — `sidebar-callout-hc`

| Field | Value |
|-------|-------|
| Firm layout name | High contrast 3 |
| Proposed `layoutId` | `sidebar-callout-hc` |
| Naming rationale | High-contrast styling of sidebar-callout geometry. |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit title | x=0.608 y=2.886 w=2.673 h=0.991 | slot.title | title | — |
| Espace réservé du texte 2 | body | Click to edit subtitle | x=0.602 y=4.163 w=2.673 h=0.374 | slot.subtitle-1 | subtitle | Sidebar subtitle 1 (left stack) |
| Espace réservé du texte 3 | body | Click to edit subtitle | x=3.888 y=0.994 w=8.843 h=0.232 | slot.subtitle-2 | subtitle | Subtitle 2 above main content pane (slide instance; idx 3) |
| Espace réservé du contenu 4 | idx:4 | Click to edit Master text styles Second  | x=3.888 y=1.467 w=8.843 h=5.354 | slot.body | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=3.878 y=7.185 w=6.884 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 8 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 26 — `sidebar-callout-hc-inverse`

| Field | Value |
|-------|-------|
| Firm layout name | High contrast 4 |
| Proposed `layoutId` | `sidebar-callout-hc-inverse` |
| Naming rationale | Same geometry and slot vocabulary as High contrast 3 — inverted brand fill (white / green). |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit title | x=0.608 y=2.886 w=2.673 h=0.991 | slot.title | title | — |
| Espace réservé du texte 2 | body | Click to edit subtitle | x=0.602 y=4.163 w=2.673 h=0.374 | slot.subtitle-1 | subtitle | Sidebar subtitle 1 (left stack) |
| Espace réservé du texte 3 | body | Click to edit subtitle | x=3.888 y=0.994 w=8.843 h=0.237 | slot.subtitle-2 | subtitle | Subtitle 2 above main content pane (slide instance; idx 3) |
| Espace réservé du contenu 4 | idx:4 | Click to edit Master text styles Second  | x=3.888 y=1.467 w=8.843 h=5.354 | slot.body | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=4.619 y=7.185 w=6.142 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 4 | — | ACME_logo | x=3.877 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 27 — `big-number`

| Field | Value |
|-------|-------|
| Firm layout name | Big number |
| Proposed `layoutId` | `big-number` |
| Naming rationale | New archetype (D27, T-211) — single hero statistic with a supporting caption. Synthetic-adjacent: the deck corpus shows big numbers only as a collapsed KPI column (one centred metric), so this is KPI-1. |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.big-number | — | — | x=1.0 y=2.35 w=11.33 h=1.7 | slot.big-number | content | Hero statistic — centred (Arial, accent-2 green) |
| slot.caption | — | — | x=1.0 y=4.25 w=11.33 h=1.3 | slot.caption | subtitle | Caption beneath the figure |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 28 — `process-3`

| Field | Value |
|-------|-------|
| Firm layout name | Process |
| Proposed `layoutId` | `process-3` |
| Naming rationale | New archetype (D27, T-211) — horizontal 3-step process; pentagon-start + chevrons + numbered badges (deck-corpus signature). |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.process-step.1.title | — | — | x=0.6 y=1.7 w=3.923 h=0.62 | slot.process-step.1.title | subtitle | Step 1 chevron label |
| slot.process-step.1.body | — | — | x=0.6 y=2.55 w=3.923 h=3.9 | slot.process-step.1.body | content | Step 1 body |
| slot.process-step.2.title | — | — | x=4.643 y=1.7 w=3.923 h=0.62 | slot.process-step.2.title | subtitle | Step 2 chevron label |
| slot.process-step.2.body | — | — | x=4.643 y=2.55 w=3.923 h=3.9 | slot.process-step.2.body | content | Step 2 body |
| slot.process-step.3.title | — | — | x=8.687 y=1.7 w=3.923 h=0.62 | slot.process-step.3.title | subtitle | Step 3 chevron label |
| slot.process-step.3.body | — | — | x=8.687 y=2.55 w=3.923 h=3.9 | slot.process-step.3.body | content | Step 3 body |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 29 — `process-4`

| Field | Value |
|-------|-------|
| Firm layout name | Process |
| Proposed `layoutId` | `process-4` |
| Naming rationale | New archetype (D27, T-211) — horizontal 4-step process; pentagon-start + chevrons + numbered badges (deck-corpus signature). |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.process-step.1.title | — | — | x=0.6 y=1.7 w=2.913 h=0.62 | slot.process-step.1.title | subtitle | Step 1 chevron label |
| slot.process-step.1.body | — | — | x=0.6 y=2.55 w=2.913 h=3.9 | slot.process-step.1.body | content | Step 1 body |
| slot.process-step.2.title | — | — | x=3.633 y=1.7 w=2.913 h=0.62 | slot.process-step.2.title | subtitle | Step 2 chevron label |
| slot.process-step.2.body | — | — | x=3.633 y=2.55 w=2.913 h=3.9 | slot.process-step.2.body | content | Step 2 body |
| slot.process-step.3.title | — | — | x=6.665 y=1.7 w=2.913 h=0.62 | slot.process-step.3.title | subtitle | Step 3 chevron label |
| slot.process-step.3.body | — | — | x=6.665 y=2.55 w=2.913 h=3.9 | slot.process-step.3.body | content | Step 3 body |
| slot.process-step.4.title | — | — | x=9.697 y=1.7 w=2.913 h=0.62 | slot.process-step.4.title | subtitle | Step 4 chevron label |
| slot.process-step.4.body | — | — | x=9.697 y=2.55 w=2.913 h=3.9 | slot.process-step.4.body | content | Step 4 body |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 30 — `process-5`

| Field | Value |
|-------|-------|
| Firm layout name | Process |
| Proposed `layoutId` | `process-5` |
| Naming rationale | New archetype (D27, T-211) — horizontal 5-step process; pentagon-start + chevrons + numbered badges (deck-corpus signature). |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.process-step.1.title | — | — | x=0.6 y=1.7 w=2.306 h=0.62 | slot.process-step.1.title | subtitle | Step 1 chevron label |
| slot.process-step.1.body | — | — | x=0.6 y=2.55 w=2.306 h=3.9 | slot.process-step.1.body | content | Step 1 body |
| slot.process-step.2.title | — | — | x=3.026 y=1.7 w=2.306 h=0.62 | slot.process-step.2.title | subtitle | Step 2 chevron label |
| slot.process-step.2.body | — | — | x=3.026 y=2.55 w=2.306 h=3.9 | slot.process-step.2.body | content | Step 2 body |
| slot.process-step.3.title | — | — | x=5.452 y=1.7 w=2.306 h=0.62 | slot.process-step.3.title | subtitle | Step 3 chevron label |
| slot.process-step.3.body | — | — | x=5.452 y=2.55 w=2.306 h=3.9 | slot.process-step.3.body | content | Step 3 body |
| slot.process-step.4.title | — | — | x=7.878 y=1.7 w=2.306 h=0.62 | slot.process-step.4.title | subtitle | Step 4 chevron label |
| slot.process-step.4.body | — | — | x=7.878 y=2.55 w=2.306 h=3.9 | slot.process-step.4.body | content | Step 4 body |
| slot.process-step.5.title | — | — | x=10.304 y=1.7 w=2.306 h=0.62 | slot.process-step.5.title | subtitle | Step 5 chevron label |
| slot.process-step.5.body | — | — | x=10.304 y=2.55 w=2.306 h=3.9 | slot.process-step.5.body | content | Step 5 body |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 31 — `kpi-3`

| Field | Value |
|-------|-------|
| Firm layout name | KPI row |
| Proposed `layoutId` | `kpi-3` |
| Naming rationale | New archetype (D27, T-211) — 3 KPI metrics as a divider-bar stat band (big number / label / detail). |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.kpi.1.value | — | — | x=0.6 y=2.1 w=3.743 h=0.95 | slot.kpi.1.value | subtitle | KPI 1 headline figure |
| slot.kpi.1.label | — | — | x=0.6 y=3.05 w=3.743 h=0.5 | slot.kpi.1.label | subtitle | KPI 1 label |
| slot.kpi.1.body | — | — | x=0.6 y=3.6 w=3.743 h=2.7 | slot.kpi.1.body | content | KPI 1 supporting detail |
| slot.kpi.2.value | — | — | x=4.643 y=2.1 w=3.743 h=0.95 | slot.kpi.2.value | subtitle | KPI 2 headline figure |
| slot.kpi.2.label | — | — | x=4.643 y=3.05 w=3.743 h=0.5 | slot.kpi.2.label | subtitle | KPI 2 label |
| slot.kpi.2.body | — | — | x=4.643 y=3.6 w=3.743 h=2.7 | slot.kpi.2.body | content | KPI 2 supporting detail |
| slot.kpi.3.value | — | — | x=8.687 y=2.1 w=3.743 h=0.95 | slot.kpi.3.value | subtitle | KPI 3 headline figure |
| slot.kpi.3.label | — | — | x=8.687 y=3.05 w=3.743 h=0.5 | slot.kpi.3.label | subtitle | KPI 3 label |
| slot.kpi.3.body | — | — | x=8.687 y=3.6 w=3.743 h=2.7 | slot.kpi.3.body | content | KPI 3 supporting detail |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 32 — `kpi-4`

| Field | Value |
|-------|-------|
| Firm layout name | KPI row |
| Proposed `layoutId` | `kpi-4` |
| Naming rationale | New archetype (D27, T-211) — 4 KPI metrics as a divider-bar stat band (big number / label / detail). |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.kpi.1.value | — | — | x=0.6 y=2.1 w=2.733 h=0.95 | slot.kpi.1.value | subtitle | KPI 1 headline figure |
| slot.kpi.1.label | — | — | x=0.6 y=3.05 w=2.733 h=0.5 | slot.kpi.1.label | subtitle | KPI 1 label |
| slot.kpi.1.body | — | — | x=0.6 y=3.6 w=2.733 h=2.7 | slot.kpi.1.body | content | KPI 1 supporting detail |
| slot.kpi.2.value | — | — | x=3.633 y=2.1 w=2.733 h=0.95 | slot.kpi.2.value | subtitle | KPI 2 headline figure |
| slot.kpi.2.label | — | — | x=3.633 y=3.05 w=2.733 h=0.5 | slot.kpi.2.label | subtitle | KPI 2 label |
| slot.kpi.2.body | — | — | x=3.633 y=3.6 w=2.733 h=2.7 | slot.kpi.2.body | content | KPI 2 supporting detail |
| slot.kpi.3.value | — | — | x=6.665 y=2.1 w=2.733 h=0.95 | slot.kpi.3.value | subtitle | KPI 3 headline figure |
| slot.kpi.3.label | — | — | x=6.665 y=3.05 w=2.733 h=0.5 | slot.kpi.3.label | subtitle | KPI 3 label |
| slot.kpi.3.body | — | — | x=6.665 y=3.6 w=2.733 h=2.7 | slot.kpi.3.body | content | KPI 3 supporting detail |
| slot.kpi.4.value | — | — | x=9.697 y=2.1 w=2.733 h=0.95 | slot.kpi.4.value | subtitle | KPI 4 headline figure |
| slot.kpi.4.label | — | — | x=9.697 y=3.05 w=2.733 h=0.5 | slot.kpi.4.label | subtitle | KPI 4 label |
| slot.kpi.4.body | — | — | x=9.697 y=3.6 w=2.733 h=2.7 | slot.kpi.4.body | content | KPI 4 supporting detail |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 33 — `kpi-5`

| Field | Value |
|-------|-------|
| Firm layout name | KPI row |
| Proposed `layoutId` | `kpi-5` |
| Naming rationale | New archetype (D27, T-211) — 5 KPI metrics as a divider-bar stat band (big number / label / detail). |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.kpi.1.value | — | — | x=0.6 y=2.1 w=2.126 h=0.95 | slot.kpi.1.value | subtitle | KPI 1 headline figure |
| slot.kpi.1.label | — | — | x=0.6 y=3.05 w=2.126 h=0.5 | slot.kpi.1.label | subtitle | KPI 1 label |
| slot.kpi.1.body | — | — | x=0.6 y=3.6 w=2.126 h=2.7 | slot.kpi.1.body | content | KPI 1 supporting detail |
| slot.kpi.2.value | — | — | x=3.026 y=2.1 w=2.126 h=0.95 | slot.kpi.2.value | subtitle | KPI 2 headline figure |
| slot.kpi.2.label | — | — | x=3.026 y=3.05 w=2.126 h=0.5 | slot.kpi.2.label | subtitle | KPI 2 label |
| slot.kpi.2.body | — | — | x=3.026 y=3.6 w=2.126 h=2.7 | slot.kpi.2.body | content | KPI 2 supporting detail |
| slot.kpi.3.value | — | — | x=5.452 y=2.1 w=2.126 h=0.95 | slot.kpi.3.value | subtitle | KPI 3 headline figure |
| slot.kpi.3.label | — | — | x=5.452 y=3.05 w=2.126 h=0.5 | slot.kpi.3.label | subtitle | KPI 3 label |
| slot.kpi.3.body | — | — | x=5.452 y=3.6 w=2.126 h=2.7 | slot.kpi.3.body | content | KPI 3 supporting detail |
| slot.kpi.4.value | — | — | x=7.878 y=2.1 w=2.126 h=0.95 | slot.kpi.4.value | subtitle | KPI 4 headline figure |
| slot.kpi.4.label | — | — | x=7.878 y=3.05 w=2.126 h=0.5 | slot.kpi.4.label | subtitle | KPI 4 label |
| slot.kpi.4.body | — | — | x=7.878 y=3.6 w=2.126 h=2.7 | slot.kpi.4.body | content | KPI 4 supporting detail |
| slot.kpi.5.value | — | — | x=10.304 y=2.1 w=2.126 h=0.95 | slot.kpi.5.value | subtitle | KPI 5 headline figure |
| slot.kpi.5.label | — | — | x=10.304 y=3.05 w=2.126 h=0.5 | slot.kpi.5.label | subtitle | KPI 5 label |
| slot.kpi.5.body | — | — | x=10.304 y=3.6 w=2.126 h=2.7 | slot.kpi.5.body | content | KPI 5 supporting detail |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 34 — `funnel-3`

| Field | Value |
|-------|-------|
| Firm layout name | Funnel |
| Proposed `layoutId` | `funnel-3` |
| Naming rationale | New archetype (D27, T-211) — SYNTHETIC (3-stage narrowing bars). Zero corpus reference; flagged for brand sign-off scrutiny. |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.funnel-stage.1.title | — | — | x=0.7 y=1.6 w=7.4 h=1.52 | slot.funnel-stage.1.title | subtitle | Funnel stage 1 label (synthetic) |
| slot.funnel-stage.1.body | — | — | x=8.3 y=1.6 w=4.4 h=1.52 | slot.funnel-stage.1.body | content | Funnel stage 1 detail |
| slot.funnel-stage.2.title | — | — | x=1.181 y=3.3 w=6.438 h=1.52 | slot.funnel-stage.2.title | subtitle | Funnel stage 2 label (synthetic) |
| slot.funnel-stage.2.body | — | — | x=8.3 y=3.3 w=4.4 h=1.52 | slot.funnel-stage.2.body | content | Funnel stage 2 detail |
| slot.funnel-stage.3.title | — | — | x=1.662 y=5.0 w=5.476 h=1.52 | slot.funnel-stage.3.title | subtitle | Funnel stage 3 label (synthetic) |
| slot.funnel-stage.3.body | — | — | x=8.3 y=5.0 w=4.4 h=1.52 | slot.funnel-stage.3.body | content | Funnel stage 3 detail |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 35 — `funnel-4`

| Field | Value |
|-------|-------|
| Firm layout name | Funnel |
| Proposed `layoutId` | `funnel-4` |
| Naming rationale | New archetype (D27, T-211) — SYNTHETIC (4-stage narrowing bars). Zero corpus reference; flagged for brand sign-off scrutiny. |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.funnel-stage.1.title | — | — | x=0.7 y=1.6 w=7.4 h=1.095 | slot.funnel-stage.1.title | subtitle | Funnel stage 1 label (synthetic) |
| slot.funnel-stage.1.body | — | — | x=8.3 y=1.6 w=4.4 h=1.095 | slot.funnel-stage.1.body | content | Funnel stage 1 detail |
| slot.funnel-stage.2.title | — | — | x=1.181 y=2.875 w=6.438 h=1.095 | slot.funnel-stage.2.title | subtitle | Funnel stage 2 label (synthetic) |
| slot.funnel-stage.2.body | — | — | x=8.3 y=2.875 w=4.4 h=1.095 | slot.funnel-stage.2.body | content | Funnel stage 2 detail |
| slot.funnel-stage.3.title | — | — | x=1.662 y=4.15 w=5.476 h=1.095 | slot.funnel-stage.3.title | subtitle | Funnel stage 3 label (synthetic) |
| slot.funnel-stage.3.body | — | — | x=8.3 y=4.15 w=4.4 h=1.095 | slot.funnel-stage.3.body | content | Funnel stage 3 detail |
| slot.funnel-stage.4.title | — | — | x=2.143 y=5.425 w=4.514 h=1.095 | slot.funnel-stage.4.title | subtitle | Funnel stage 4 label (synthetic) |
| slot.funnel-stage.4.body | — | — | x=8.3 y=5.425 w=4.4 h=1.095 | slot.funnel-stage.4.body | content | Funnel stage 4 detail |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 36 — `funnel-5`

| Field | Value |
|-------|-------|
| Firm layout name | Funnel |
| Proposed `layoutId` | `funnel-5` |
| Naming rationale | New archetype (D27, T-211) — SYNTHETIC (5-stage narrowing bars). Zero corpus reference; flagged for brand sign-off scrutiny. |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.funnel-stage.1.title | — | — | x=0.7 y=1.6 w=7.4 h=0.84 | slot.funnel-stage.1.title | subtitle | Funnel stage 1 label (synthetic) |
| slot.funnel-stage.1.body | — | — | x=8.3 y=1.6 w=4.4 h=0.84 | slot.funnel-stage.1.body | content | Funnel stage 1 detail |
| slot.funnel-stage.2.title | — | — | x=1.181 y=2.62 w=6.438 h=0.84 | slot.funnel-stage.2.title | subtitle | Funnel stage 2 label (synthetic) |
| slot.funnel-stage.2.body | — | — | x=8.3 y=2.62 w=4.4 h=0.84 | slot.funnel-stage.2.body | content | Funnel stage 2 detail |
| slot.funnel-stage.3.title | — | — | x=1.662 y=3.64 w=5.476 h=0.84 | slot.funnel-stage.3.title | subtitle | Funnel stage 3 label (synthetic) |
| slot.funnel-stage.3.body | — | — | x=8.3 y=3.64 w=4.4 h=0.84 | slot.funnel-stage.3.body | content | Funnel stage 3 detail |
| slot.funnel-stage.4.title | — | — | x=2.143 y=4.66 w=4.514 h=0.84 | slot.funnel-stage.4.title | subtitle | Funnel stage 4 label (synthetic) |
| slot.funnel-stage.4.body | — | — | x=8.3 y=4.66 w=4.4 h=0.84 | slot.funnel-stage.4.body | content | Funnel stage 4 detail |
| slot.funnel-stage.5.title | — | — | x=2.624 y=5.68 w=3.552 h=0.84 | slot.funnel-stage.5.title | subtitle | Funnel stage 5 label (synthetic) |
| slot.funnel-stage.5.body | — | — | x=8.3 y=5.68 w=4.4 h=0.84 | slot.funnel-stage.5.body | content | Funnel stage 5 detail |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 37 — `feature-grid-3`

| Field | Value |
|-------|-------|
| Firm layout name | Feature grid |
| Proposed `layoutId` | `feature-grid-3` |
| Naming rationale | New archetype (D27, T-211) — 3 feature cards: coloured header bar + body (deck column-card pattern). |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.feature.1.title | — | — | x=0.6 y=2.25 w=3.793 h=0.5 | slot.feature.1.title | subtitle | Feature 1 header |
| slot.feature.1.body | — | — | x=0.6 y=2.9 w=3.793 h=3.5 | slot.feature.1.body | content | Feature 1 body |
| slot.feature.2.title | — | — | x=4.643 y=2.25 w=3.793 h=0.5 | slot.feature.2.title | subtitle | Feature 2 header |
| slot.feature.2.body | — | — | x=4.643 y=2.9 w=3.793 h=3.5 | slot.feature.2.body | content | Feature 2 body |
| slot.feature.3.title | — | — | x=8.687 y=2.25 w=3.793 h=0.5 | slot.feature.3.title | subtitle | Feature 3 header |
| slot.feature.3.body | — | — | x=8.687 y=2.9 w=3.793 h=3.5 | slot.feature.3.body | content | Feature 3 body |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 38 — `feature-grid-4`

| Field | Value |
|-------|-------|
| Firm layout name | Feature grid |
| Proposed `layoutId` | `feature-grid-4` |
| Naming rationale | New archetype (D27, T-211) — 4 feature cards: coloured header bar + body (deck column-card pattern). |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.feature.1.title | — | — | x=0.6 y=2.25 w=2.783 h=0.5 | slot.feature.1.title | subtitle | Feature 1 header |
| slot.feature.1.body | — | — | x=0.6 y=2.9 w=2.783 h=3.5 | slot.feature.1.body | content | Feature 1 body |
| slot.feature.2.title | — | — | x=3.633 y=2.25 w=2.783 h=0.5 | slot.feature.2.title | subtitle | Feature 2 header |
| slot.feature.2.body | — | — | x=3.633 y=2.9 w=2.783 h=3.5 | slot.feature.2.body | content | Feature 2 body |
| slot.feature.3.title | — | — | x=6.665 y=2.25 w=2.783 h=0.5 | slot.feature.3.title | subtitle | Feature 3 header |
| slot.feature.3.body | — | — | x=6.665 y=2.9 w=2.783 h=3.5 | slot.feature.3.body | content | Feature 3 body |
| slot.feature.4.title | — | — | x=9.697 y=2.25 w=2.783 h=0.5 | slot.feature.4.title | subtitle | Feature 4 header |
| slot.feature.4.body | — | — | x=9.697 y=2.9 w=2.783 h=3.5 | slot.feature.4.body | content | Feature 4 body |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 39 — `feature-grid-5`

| Field | Value |
|-------|-------|
| Firm layout name | Feature grid |
| Proposed `layoutId` | `feature-grid-5` |
| Naming rationale | New archetype (D27, T-211) — 5 feature cards: coloured header bar + body (deck column-card pattern). |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.feature.1.title | — | — | x=0.6 y=2.25 w=2.176 h=0.5 | slot.feature.1.title | subtitle | Feature 1 header |
| slot.feature.1.body | — | — | x=0.6 y=2.9 w=2.176 h=3.5 | slot.feature.1.body | content | Feature 1 body |
| slot.feature.2.title | — | — | x=3.026 y=2.25 w=2.176 h=0.5 | slot.feature.2.title | subtitle | Feature 2 header |
| slot.feature.2.body | — | — | x=3.026 y=2.9 w=2.176 h=3.5 | slot.feature.2.body | content | Feature 2 body |
| slot.feature.3.title | — | — | x=5.452 y=2.25 w=2.176 h=0.5 | slot.feature.3.title | subtitle | Feature 3 header |
| slot.feature.3.body | — | — | x=5.452 y=2.9 w=2.176 h=3.5 | slot.feature.3.body | content | Feature 3 body |
| slot.feature.4.title | — | — | x=7.878 y=2.25 w=2.176 h=0.5 | slot.feature.4.title | subtitle | Feature 4 header |
| slot.feature.4.body | — | — | x=7.878 y=2.9 w=2.176 h=3.5 | slot.feature.4.body | content | Feature 4 body |
| slot.feature.5.title | — | — | x=10.304 y=2.25 w=2.176 h=0.5 | slot.feature.5.title | subtitle | Feature 5 header |
| slot.feature.5.body | — | — | x=10.304 y=2.9 w=2.176 h=3.5 | slot.feature.5.body | content | Feature 5 body |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 40 — `roadmap-3`

| Field | Value |
|-------|-------|
| Firm layout name | Roadmap |
| Proposed `layoutId` | `roadmap-3` |
| Naming rationale | New archetype (D27, T-211) — 3-phase roadmap: timeline rule + numbered phase markers, timeframe + body per phase. |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.phase.1.caption | — | — | x=0.6 y=2.35 w=3.843 h=0.4 | slot.phase.1.caption | subtitle | Phase 1 timeframe |
| slot.phase.1.title | — | — | x=0.6 y=2.75 w=3.843 h=0.5 | slot.phase.1.title | subtitle | Phase 1 title |
| slot.phase.1.body | — | — | x=0.6 y=3.35 w=3.843 h=3.1 | slot.phase.1.body | content | Phase 1 body |
| slot.phase.2.caption | — | — | x=4.643 y=2.35 w=3.843 h=0.4 | slot.phase.2.caption | subtitle | Phase 2 timeframe |
| slot.phase.2.title | — | — | x=4.643 y=2.75 w=3.843 h=0.5 | slot.phase.2.title | subtitle | Phase 2 title |
| slot.phase.2.body | — | — | x=4.643 y=3.35 w=3.843 h=3.1 | slot.phase.2.body | content | Phase 2 body |
| slot.phase.3.caption | — | — | x=8.687 y=2.35 w=3.843 h=0.4 | slot.phase.3.caption | subtitle | Phase 3 timeframe |
| slot.phase.3.title | — | — | x=8.687 y=2.75 w=3.843 h=0.5 | slot.phase.3.title | subtitle | Phase 3 title |
| slot.phase.3.body | — | — | x=8.687 y=3.35 w=3.843 h=3.1 | slot.phase.3.body | content | Phase 3 body |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 41 — `roadmap-4`

| Field | Value |
|-------|-------|
| Firm layout name | Roadmap |
| Proposed `layoutId` | `roadmap-4` |
| Naming rationale | New archetype (D27, T-211) — 4-phase roadmap: timeline rule + numbered phase markers, timeframe + body per phase. |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.phase.1.caption | — | — | x=0.6 y=2.35 w=2.833 h=0.4 | slot.phase.1.caption | subtitle | Phase 1 timeframe |
| slot.phase.1.title | — | — | x=0.6 y=2.75 w=2.833 h=0.5 | slot.phase.1.title | subtitle | Phase 1 title |
| slot.phase.1.body | — | — | x=0.6 y=3.35 w=2.833 h=3.1 | slot.phase.1.body | content | Phase 1 body |
| slot.phase.2.caption | — | — | x=3.633 y=2.35 w=2.833 h=0.4 | slot.phase.2.caption | subtitle | Phase 2 timeframe |
| slot.phase.2.title | — | — | x=3.633 y=2.75 w=2.833 h=0.5 | slot.phase.2.title | subtitle | Phase 2 title |
| slot.phase.2.body | — | — | x=3.633 y=3.35 w=2.833 h=3.1 | slot.phase.2.body | content | Phase 2 body |
| slot.phase.3.caption | — | — | x=6.665 y=2.35 w=2.833 h=0.4 | slot.phase.3.caption | subtitle | Phase 3 timeframe |
| slot.phase.3.title | — | — | x=6.665 y=2.75 w=2.833 h=0.5 | slot.phase.3.title | subtitle | Phase 3 title |
| slot.phase.3.body | — | — | x=6.665 y=3.35 w=2.833 h=3.1 | slot.phase.3.body | content | Phase 3 body |
| slot.phase.4.caption | — | — | x=9.697 y=2.35 w=2.833 h=0.4 | slot.phase.4.caption | subtitle | Phase 4 timeframe |
| slot.phase.4.title | — | — | x=9.697 y=2.75 w=2.833 h=0.5 | slot.phase.4.title | subtitle | Phase 4 title |
| slot.phase.4.body | — | — | x=9.697 y=3.35 w=2.833 h=3.1 | slot.phase.4.body | content | Phase 4 body |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 42 — `roadmap-5`

| Field | Value |
|-------|-------|
| Firm layout name | Roadmap |
| Proposed `layoutId` | `roadmap-5` |
| Naming rationale | New archetype (D27, T-211) — 5-phase roadmap: timeline rule + numbered phase markers, timeframe + body per phase. |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.phase.1.caption | — | — | x=0.6 y=2.35 w=2.226 h=0.4 | slot.phase.1.caption | subtitle | Phase 1 timeframe |
| slot.phase.1.title | — | — | x=0.6 y=2.75 w=2.226 h=0.5 | slot.phase.1.title | subtitle | Phase 1 title |
| slot.phase.1.body | — | — | x=0.6 y=3.35 w=2.226 h=3.1 | slot.phase.1.body | content | Phase 1 body |
| slot.phase.2.caption | — | — | x=3.026 y=2.35 w=2.226 h=0.4 | slot.phase.2.caption | subtitle | Phase 2 timeframe |
| slot.phase.2.title | — | — | x=3.026 y=2.75 w=2.226 h=0.5 | slot.phase.2.title | subtitle | Phase 2 title |
| slot.phase.2.body | — | — | x=3.026 y=3.35 w=2.226 h=3.1 | slot.phase.2.body | content | Phase 2 body |
| slot.phase.3.caption | — | — | x=5.452 y=2.35 w=2.226 h=0.4 | slot.phase.3.caption | subtitle | Phase 3 timeframe |
| slot.phase.3.title | — | — | x=5.452 y=2.75 w=2.226 h=0.5 | slot.phase.3.title | subtitle | Phase 3 title |
| slot.phase.3.body | — | — | x=5.452 y=3.35 w=2.226 h=3.1 | slot.phase.3.body | content | Phase 3 body |
| slot.phase.4.caption | — | — | x=7.878 y=2.35 w=2.226 h=0.4 | slot.phase.4.caption | subtitle | Phase 4 timeframe |
| slot.phase.4.title | — | — | x=7.878 y=2.75 w=2.226 h=0.5 | slot.phase.4.title | subtitle | Phase 4 title |
| slot.phase.4.body | — | — | x=7.878 y=3.35 w=2.226 h=3.1 | slot.phase.4.body | content | Phase 4 body |
| slot.phase.5.caption | — | — | x=10.304 y=2.35 w=2.226 h=0.4 | slot.phase.5.caption | subtitle | Phase 5 timeframe |
| slot.phase.5.title | — | — | x=10.304 y=2.75 w=2.226 h=0.5 | slot.phase.5.title | subtitle | Phase 5 title |
| slot.phase.5.body | — | — | x=10.304 y=3.35 w=2.226 h=3.1 | slot.phase.5.body | content | Phase 5 body |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 43 — `value-chain`

| Field | Value |
|-------|-------|
| Firm layout name | Value chain |
| Proposed `layoutId` | `value-chain` |
| Naming rationale | New archetype (D27, T-211) — source → 5 stage nodes → customer; the most-used pattern in the deck corpus. |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.value-chain.source | — | — | x=0.6 y=1.7 w=1.7 h=0.9 | slot.value-chain.source | subtitle | Upstream source label |
| slot.value-chain.stage.1.title | — | — | x=2.5 y=1.7 w=1.55 h=0.9 | slot.value-chain.stage.1.title | subtitle | Value-chain stage 1 |
| slot.value-chain.stage.2.title | — | — | x=4.12 y=1.7 w=1.55 h=0.9 | slot.value-chain.stage.2.title | subtitle | Value-chain stage 2 |
| slot.value-chain.stage.3.title | — | — | x=5.74 y=1.7 w=1.55 h=0.9 | slot.value-chain.stage.3.title | subtitle | Value-chain stage 3 |
| slot.value-chain.stage.4.title | — | — | x=7.36 y=1.7 w=1.55 h=0.9 | slot.value-chain.stage.4.title | subtitle | Value-chain stage 4 |
| slot.value-chain.stage.5.title | — | — | x=8.98 y=1.7 w=1.55 h=0.9 | slot.value-chain.stage.5.title | subtitle | Value-chain stage 5 |
| slot.value-chain.customer | — | — | x=11.0 y=1.7 w=1.7 h=0.9 | slot.value-chain.customer | subtitle | Downstream customer label |
| slot.value-chain.body | — | — | x=0.6 y=3.05 w=12.13 h=3.4 | slot.value-chain.body | content | Value-chain narrative |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 44 — `gantt`

| Field | Value |
|-------|-------|
| Firm layout name | Gantt |
| Proposed `layoutId` | `gantt` |
| Naming rationale | New archetype (D27, T-211) — time-grid header + 4 workstream lanes with task bars; distinct from the phase-card roadmap. |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.gantt.lane.1.label | — | — | x=0.6 y=2.1 w=3.0 h=0.5 | slot.gantt.lane.1.label | subtitle | Gantt lane 1 label |
| slot.gantt.lane.1.body | — | — | x=0.6 y=2.6 w=3.0 h=0.5 | slot.gantt.lane.1.body | content | Gantt lane 1 tasks |
| slot.gantt.lane.2.label | — | — | x=0.6 y=3.2 w=3.0 h=0.5 | slot.gantt.lane.2.label | subtitle | Gantt lane 2 label |
| slot.gantt.lane.2.body | — | — | x=0.6 y=3.7 w=3.0 h=0.5 | slot.gantt.lane.2.body | content | Gantt lane 2 tasks |
| slot.gantt.lane.3.label | — | — | x=0.6 y=4.3 w=3.0 h=0.5 | slot.gantt.lane.3.label | subtitle | Gantt lane 3 label |
| slot.gantt.lane.3.body | — | — | x=0.6 y=4.8 w=3.0 h=0.5 | slot.gantt.lane.3.body | content | Gantt lane 3 tasks |
| slot.gantt.lane.4.label | — | — | x=0.6 y=5.4 w=3.0 h=0.5 | slot.gantt.lane.4.label | subtitle | Gantt lane 4 label |
| slot.gantt.lane.4.body | — | — | x=0.6 y=5.9 w=3.0 h=0.5 | slot.gantt.lane.4.body | content | Gantt lane 4 tasks |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 45 — `matrix-2x2`

| Field | Value |
|-------|-------|
| Firm layout name | Matrix 2x2 |
| Proposed `layoutId` | `matrix-2x2` |
| Naming rationale | New archetype (D27, T-211) — 2×2 quadrant matrix with two axis labels (bubble/quadrant pattern). |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.matrix.axis-x | — | — | x=4.0 y=6.4 w=8.3 h=0.4 | slot.matrix.axis-x | subtitle | Horizontal axis label |
| slot.matrix.axis-y | — | — | x=3.0 y=1.7 w=0.9 h=4.6 | slot.matrix.axis-y | subtitle | Vertical axis label |
| slot.matrix.quadrant.1.title | — | — | x=4.1 y=1.8 w=3.95 h=0.4 | slot.matrix.quadrant.1.title | subtitle | Quadrant 1 title |
| slot.matrix.quadrant.1.body | — | — | x=4.1 y=2.25 w=3.95 h=1.65 | slot.matrix.quadrant.1.body | content | Quadrant 1 body |
| slot.matrix.quadrant.2.title | — | — | x=8.25 y=1.8 w=3.95 h=0.4 | slot.matrix.quadrant.2.title | subtitle | Quadrant 2 title |
| slot.matrix.quadrant.2.body | — | — | x=8.25 y=2.25 w=3.95 h=1.65 | slot.matrix.quadrant.2.body | content | Quadrant 2 body |
| slot.matrix.quadrant.3.title | — | — | x=4.1 y=4.1 w=3.95 h=0.4 | slot.matrix.quadrant.3.title | subtitle | Quadrant 3 title |
| slot.matrix.quadrant.3.body | — | — | x=4.1 y=4.55 w=3.95 h=1.65 | slot.matrix.quadrant.3.body | content | Quadrant 3 body |
| slot.matrix.quadrant.4.title | — | — | x=8.25 y=4.1 w=3.95 h=0.4 | slot.matrix.quadrant.4.title | subtitle | Quadrant 4 title |
| slot.matrix.quadrant.4.body | — | — | x=8.25 y=4.55 w=3.95 h=1.65 | slot.matrix.quadrant.4.body | content | Quadrant 4 body |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 46 — `matrix-9box`

| Field | Value |
|-------|-------|
| Firm layout name | Matrix 9-box |
| Proposed `layoutId` | `matrix-9box` |
| Naming rationale | New archetype (D27, T-211) — 3×3 nine-box grid with two axis labels (optional matrix variant). |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.matrix.axis-x | — | — | x=4.0 y=6.4 w=8.3 h=0.4 | slot.matrix.axis-x | subtitle | Horizontal axis label |
| slot.matrix.axis-y | — | — | x=3.0 y=1.7 w=0.9 h=4.6 | slot.matrix.axis-y | subtitle | Vertical axis label |
| slot.matrix.cell.1.title | — | — | x=4.06 y=1.76 w=2.647 h=1.413 | slot.matrix.cell.1.title | subtitle | 9-box cell 1 |
| slot.matrix.cell.2.title | — | — | x=6.827 y=1.76 w=2.647 h=1.413 | slot.matrix.cell.2.title | subtitle | 9-box cell 2 |
| slot.matrix.cell.3.title | — | — | x=9.594 y=1.76 w=2.647 h=1.413 | slot.matrix.cell.3.title | subtitle | 9-box cell 3 |
| slot.matrix.cell.4.title | — | — | x=4.06 y=3.293 w=2.647 h=1.413 | slot.matrix.cell.4.title | subtitle | 9-box cell 4 |
| slot.matrix.cell.5.title | — | — | x=6.827 y=3.293 w=2.647 h=1.413 | slot.matrix.cell.5.title | subtitle | 9-box cell 5 |
| slot.matrix.cell.6.title | — | — | x=9.594 y=3.293 w=2.647 h=1.413 | slot.matrix.cell.6.title | subtitle | 9-box cell 6 |
| slot.matrix.cell.7.title | — | — | x=4.06 y=4.826 w=2.647 h=1.413 | slot.matrix.cell.7.title | subtitle | 9-box cell 7 |
| slot.matrix.cell.8.title | — | — | x=6.827 y=4.826 w=2.647 h=1.413 | slot.matrix.cell.8.title | subtitle | 9-box cell 8 |
| slot.matrix.cell.9.title | — | — | x=9.594 y=4.826 w=2.647 h=1.413 | slot.matrix.cell.9.title | subtitle | 9-box cell 9 |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 47 — `quote`

| Field | Value |
|-------|-------|
| Firm layout name | Quote |
| Proposed `layoutId` | `quote` |
| Naming rationale | New archetype (D27, T-211) — full-slide pull-quote + attribution (speech-bubble callout scaled to centre). |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.quote | — | — | x=1.6 y=2.3 w=10.1 h=2.6 | slot.quote | content | Pull-quote text |
| slot.attribution | — | — | x=1.6 y=5.1 w=10.1 h=0.6 | slot.attribution | subtitle | Attribution line |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 48 — `table-rag`

| Field | Value |
|-------|-------|
| Firm layout name | Table RAG |
| Proposed `layoutId` | `table-rag` |
| Naming rationale | New archetype (D27, T-211) — table with a RAG status column; status-enum fill contract → T-213a. Brand theme has no RAG-red token — flag at sign-off. |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.table | — | — | x=0.6 y=1.5 w=12.13 h=5.0 | slot.table | table | Table region (rag) — columns pinned at fill (T-210/T-213) |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 49 — `table-comparison`

| Field | Value |
|-------|-------|
| Firm layout name | Table comparison |
| Proposed `layoutId` | `table-comparison` |
| Naming rationale | New archetype (D27, T-211) — options × criteria comparison table; fill contract → T-213b. |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.table | — | — | x=0.6 y=1.5 w=12.13 h=5.0 | slot.table | table | Table region (comparison) — columns pinned at fill (T-210/T-213) |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

### Slide 50 — `table-generic`

| Field | Value |
|-------|-------|
| Firm layout name | Table generic |
| Proposed `layoutId` | `table-generic` |
| Naming rationale | New archetype (D27, T-211) — plain data table; fill contract → T-213c. |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| slot.title | — | — | x=0.6 y=0.38 w=12.13 h=0.69 | slot.title | title | Action title |
| slot.table | — | — | x=0.6 y=1.5 w=12.13 h=5.0 | slot.table | table | Table region (generic) — columns pinned at fill (T-210/T-213) |
| slot.footer-page | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.12 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| slot.source | idx:18 | Source: 1. | x=1.35 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations — slide instance (idx 18) |

## Deletions (artifacts — not slots)

| Slide | Current `cNvPr` name | Master text | Reason |
|-------|----------------------|---------------|--------|
| 6 | Espace réservé du contenu 5 | qsdf | Stray free text box (txBox) — duplicate artifact, not a layout placeholder |

---

## Review checklist (human)

1. Confirm `chart-title` vs `subtitle` disambiguation on chart slides.
2. Confirm footer trio: `slot.footer-logo` (auto) · `slot.source` (LLM) · `slot.footer-page` (auto).
3. Confirm three-column subtitles: `slot.subtitle-left` / `-middle` / `-right`.
4. Confirm sidebar-callout: `slot.subtitle-1` (sidebar) + `slot.subtitle-2` (above content).
5. Confirm bubble dataset contract before schema phase.

**Next phase (not in scope here):** mechanical OOXML rename → Zod schemas → Layout catalogue JSON → drift test.
