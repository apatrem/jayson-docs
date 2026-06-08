# Proposed naming table — `report.master.pptx` (26 layouts)

> **STATUS: AI-PROPOSED — awaiting human review.**
> No `slot.*` names have been written into the `.pptx` yet. Phase 2 (human-gated) reviews this table, then a mechanical OOXML write renames shapes and a `shapes ≡ slots` validator runs.

Source: `templates/report.master.pptx` (sanitized firm template, 26 slides).
Extraction: OOXML from `ppt/slides/slideN.xml` + slide layout geometry/text fallback + chart part inspection.
**Disambiguation rule:** placeholder default text ("Click to edit title", "Click to edit subtitle", "Chart name, unit", "Source: 1.") takes precedence over raw PowerPoint placeholder types (`body` vs `subTitle`).

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
| Sidebar callout | `sidebar-callout` (14, 22), `sidebar-callout-hc` (25, 26) | `slot.title`, `slot.subtitle-1`, `slot.subtitle-2`, `slot.body` |
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

### Slide 7 — `chart-stacked-bar`

| Field | Value |
|-------|-------|
| Firm layout name | Title |
| Proposed `layoutId` | `chart-stacked-bar` |
| Naming rationale | Disambiguated by pre-authored stacked-bar chart (slide 7). |
| Usage tier | `common` |
| Pinned chart kind | `stacked-bar` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 10 | title | Click to edit Master title style | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du numéro de diapositive 3 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 11 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| Espace réservé du contenu 5 | — | Comment | x=7.527 y=1.775 w=5.254 h=4.865 | slot.body-right | content | Narrative beside chart |
| Espace réservé du contenu 5 | — | Chart name , unit | x=0.602 y=1.318 w=6.164 h=0.301 | slot.chart-title | chart-title | Chart title / unit line above chart (not slide subtitle) |
| Espace réservé du contenu 1 | chart | — | x=0.602 y=1.775 w=6.472 h=5.047 | slot.chart | chart | chart kind: stacked-bar |
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
| Espace réservé du contenu 1 | chart | — | x=0.602 y=1.775 w=6.491 h=5.047 | slot.chart | chart | chart kind: clustered-column |
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
| Espace réservé du contenu 1 | chart | — | x=0.602 y=1.775 w=6.248 h=5.047 | slot.chart | chart | chart kind: line |
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
| Espace réservé du contenu 1 | chart | — | x=0.602 y=1.775 w=6.192 h=5.047 | slot.chart | chart | chart kind: bubble |
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
| Espace réservé du contenu 7 | idx:2 | Click to edit Master text styles Second  | x=6.825 y=1.231 w=5.906 h=5.592 | slot.body-left | content | — |
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
| Espace réservé du numéro de diapositive 5 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=1.350 y=7.185 w=8.304 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
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
| Espace réservé du texte 4 | body | Click to edit subtitle | x=6.825 y=1.239 w=5.906 h=0.228 | slot.subtitle-center | subtitle | — |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=6.825 y=1.735 w=5.906 h=5.086 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=1.350 y=7.185 w=5.153 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
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
| Espace réservé du texte 4 | body | Click to edit subtitle | x=3.888 y=0.994 w=8.843 h=0.237 | slot.subtitle-2 | subtitle | Subtitle 2 above main content pane |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=3.888 y=1.467 w=8.853 h=5.354 | slot.body | content | — |
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
| Espace réservé du texte 2 | body | Click to edit master text styles | x=4.737 y=1.231 w=3.859 h=0.236 | slot.subtitle-middle | subtitle | — |
| Espace réservé du contenu 3 | idx:20 | Click to edit Master text styles Second  | x=4.737 y=1.663 w=3.859 h=5.158 | slot.body-center | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
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
| Espace réservé du texte 4 | body | Click to edit master text styles | x=6.824 y=1.231 w=5.906 h=0.236 | slot.subtitle-center | subtitle | — |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=6.825 y=1.663 w=5.906 h=5.158 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=1.350 y=7.185 w=9.411 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
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

### Slide 22 — `sidebar-callout`

| Field | Value |
|-------|-------|
| Firm layout name | Contrast 3 |
| Proposed `layoutId` | `sidebar-callout` |
| Naming rationale | Same geometry as Contrast 4 — shares slot vocabulary. |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit title | x=0.608 y=2.886 w=2.673 h=0.991 | slot.title | title | — |
| Espace réservé du texte 2 | body | Click to edit subtitle | x=0.602 y=4.163 w=2.673 h=0.374 | slot.subtitle-1 | subtitle | Sidebar subtitle 1 (left stack) |
| Espace réservé du texte 4 | body | Click to edit subtitle | x=3.888 y=0.994 w=8.843 h=0.237 | slot.subtitle-2 | subtitle | Subtitle 2 above main content pane |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=3.888 y=1.467 w=8.853 h=5.354 | slot.body | content | — |
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
| Espace réservé du numéro de diapositive 5 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=1.350 y=7.185 w=8.304 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
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
| Espace réservé du texte 4 | body | Click to edit subtitle | x=6.825 y=1.236 w=5.906 h=0.275 | slot.subtitle-center | subtitle | — |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=6.825 y=1.703 w=5.906 h=5.138 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=1.350 y=7.185 w=5.153 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
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
| Espace réservé du texte 4 | body | Click to edit subtitle | x=3.888 y=0.994 w=8.843 h=0.232 | slot.subtitle-2 | subtitle | Subtitle 2 above main content pane |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=3.888 y=1.467 w=8.843 h=5.354 | slot.body | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=3.878 y=7.185 w=6.884 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 8 | — | ACME_logo | x=0.591 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

### Slide 26 — `sidebar-callout-hc`

| Field | Value |
|-------|-------|
| Firm layout name | High contrast 4 |
| Proposed `layoutId` | `sidebar-callout-hc` |
| Naming rationale | Same geometry as High contrast 3. |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Master placeholder text | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|-------------------------|---------------|---------------|-------------|-------|
| Titre 1 | title | Click to edit title | x=0.608 y=2.886 w=2.673 h=0.991 | slot.title | title | — |
| Espace réservé du texte 2 | body | Click to edit subtitle | x=0.602 y=4.163 w=2.673 h=0.374 | slot.subtitle-1 | subtitle | Sidebar subtitle 1 (left stack) |
| Espace réservé du texte 4 | body | Click to edit subtitle | x=3.888 y=0.994 w=8.843 h=0.237 | slot.subtitle-2 | subtitle | Subtitle 2 above main content pane |
| Espace réservé du contenu 5 | idx:4 | Click to edit Master text styles Second  | x=3.888 y=1.467 w=8.843 h=5.354 | slot.body | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | ‹N°› | x=12.376 y=7.185 w=0.354 h=0.120 | slot.footer-page | footer | Pagination — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | Source: 1. | x=4.619 y=7.185 w=6.142 h=0.276 | slot.source | source | Source citations (hyperlinks when available) — LLM-filled |
| ZoneTexte 30 | — | ©Year Acme | x=10.840 y=7.185 w=1.350 h=0.135 | slot.footer-copyright | footer | Copyright line — deterministic from brand/master |
| ZoneTexte 4 | — | ACME_logo | x=3.877 y=7.165 w=0.667 h=0.310 | slot.footer-logo | footer | Acme logo — deterministic from brand/master |

---

## Review checklist (human)

1. Confirm `chart-title` vs `subtitle` disambiguation on chart slides.
2. Confirm footer trio: `slot.footer-logo` (auto) · `slot.source` (LLM) · `slot.footer-page` (auto).
3. Confirm three-column subtitles: `slot.subtitle-left` / `-middle` / `-right`.
4. Confirm sidebar-callout: `slot.subtitle-1` (sidebar) + `slot.subtitle-2` (above content).
5. Confirm bubble dataset contract before schema phase.

**Next phase (not in scope here):** mechanical OOXML rename → Zod schemas → Layout catalogue JSON → drift test.
