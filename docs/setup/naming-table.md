# Proposed naming table — `report.master.pptx` (26 layouts)

> **STATUS: AI-PROPOSED — awaiting human review.**
> No `slot.*` names have been written into the `.pptx` yet. Phase 2 (human-gated) reviews this table, then a mechanical OOXML write renames shapes and a `shapes ≡ slots` validator runs.

Source: `templates/report.master.pptx` (sanitized firm template, 26 slides).
Extraction: OOXML from `ppt/slides/slideN.xml` + slide layout geometry fallback + chart part inspection.

## Usage tiers (seeded from deck sections)

| Tier | Slides | Deck section |
|------|--------|--------------|
| `common` | 1–16 | "Very common slides" |
| `less-common` | 17–26 | "Less common slides" |

Thereafter the **Layout catalogue** owns tier (D22).

## New region kind: `subtitle`

The firm template uses PowerPoint `subTitle` placeholders and short `body` rows above columns. Proposed new region kind **`subtitle`** accepts block types **`text`** and **`callout`** (short supporting line under the action title or above a column). Distinct from `title` (8–15 word action title) and from full `content` bodies.

## Chart flag: `bubble` dataset shape

The `chart-bubble` layout (slide 10) pins a pre-authored **bubble** chart. Bubble charts require **x / y / size** triples per series — **not** the standard categories + numeric-series columns used by bar/line charts. The fill-plan dataset contract for this slot must be defined separately before schema work (Phase 3).

## Shared slot vocabularies

| Slot vocabulary group | `layoutId`s | Notes |
|-----------------------|-------------|-------|
| Cover family | `cover`, `cover-white` | Same four slots; white variant drops background image treatment |
| Section family | `section`, `section-white` | `slot.section-title` + `slot.subtitle` |
| Agenda family | `agenda`, `agenda-white` | `slot.title` + `slot.body-left` (agenda list) |
| Chart + narrative | `chart-stacked-bar`, `chart-clustered-column`, `chart-line`, `chart-bubble` | Identical slot geometry; chart `kind` literal differs per layout |
| Two-column | `two-columns`, `two-columns-and-subtitles` | Subtitle variant adds `slot.subtitle-left` / `slot.subtitle-right` rows |
| Sidebar callout | `sidebar-callout` (slides 14 & 22), `sidebar-callout-hc` (slides 25 & 26) | Left stacked title/subtitle + right content |
| Narrative + sidebar | `narrative-with-sidebar`, `narrative-with-sidebar-hc` | Contrast 1 / High contrast 1 geometry |
| Two-column + subheads | `two-column-with-subheads`, `two-column-with-subheads-hc` | Contrast 2 / High contrast 2 geometry |

---

## Tier: `common`

### Slide 1 — `cover`

| Field | Value |
|-------|-------|
| Firm layout name | Cover |
| Proposed `layoutId` | `cover` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Espace réservé pour une image  1 | pic | x=10.923 y=0.083 w=2.123 h=1.068 | slot.image | image | — |
| Titre 2 | ctrTitle | x=0.600 y=1.497 w=8.114 h=1.353 | slot.title | title | — |
| Sous-titre 3 | subTitle | x=0.600 y=2.943 w=8.114 h=0.571 | slot.subtitle | subtitle | — |
| Espace réservé du texte 4 | body | x=0.600 y=3.855 w=4.389 h=0.446 | slot.body | content | — |

### Slide 2 — `section`

| Field | Value |
|-------|-------|
| Firm layout name | Section |
| Proposed `layoutId` | `section` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | ctrTitle | x=0.602 y=1.225 w=7.953 h=2.611 | slot.section-title | section-title | — |
| Sous-titre 2 | subTitle | x=0.602 y=3.929 w=7.953 h=0.571 | slot.subtitle | subtitle | — |

### Slide 3 — `agenda`

| Field | Value |
|-------|-------|
| Firm layout name | Agenda |
| Proposed `layoutId` | `agenda` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.608 y=0.365 w=12.123 h=0.708 | slot.title | title | — |
| Espace réservé du contenu 2 | idx:2 | x=0.602 y=2.175 w=9.057 h=4.686 | slot.body-left | content | — |
| Espace réservé du numéro de diapositive 3 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |

### Slide 4 — `title`

| Field | Value |
|-------|-------|
| Firm layout name | Title |
| Proposed `layoutId` | `title` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du contenu 2 | idx:1 | x=0.602 y=1.231 w=12.128 h=5.590 | slot.body-left | content | — |
| Espace réservé du numéro de diapositive 3 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 4 | idx:18 | x=1.350 y=7.185 w=9.411 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

### Slide 5 — `title-only`

| Field | Value |
|-------|-------|
| Firm layout name | Title only |
| Proposed `layoutId` | `title-only` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 4 | title | — | slot.title | title | — |
| Espace réservé du contenu 5 | idx:18 | x=1.350 y=7.185 w=9.411 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |
| Espace réservé du numéro de diapositive 3 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |

### Slide 6 — `title-and-subtitle`

| Field | Value |
|-------|-------|
| Firm layout name | Title and subtitle |
| Proposed `layoutId` | `title-and-subtitle` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 4 | title | x=0.602 y=0.382 w=12.167 h=0.691 | slot.title | title | — |
| Espace réservé du contenu 5 | idx:1 | x=0.602 y=1.655 w=12.128 h=5.166 | slot.body-left | content | — |
| Sous-titre 7 | subTitle | x=0.617 y=1.239 w=12.164 h=0.228 | slot.subtitle | subtitle | — |
| Espace réservé du numéro de diapositive 3 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | x=1.350 y=7.185 w=9.411 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |
| Espace réservé du contenu 5 | — | x=2.130 y=2.577 w=12.128 h=5.166 | (skip) | — | Duplicate/non-placeholder shape — not a fill target |

### Slide 7 — `chart-stacked-bar`

| Field | Value |
|-------|-------|
| Firm layout name | Title |
| Proposed `layoutId` | `chart-stacked-bar` |
| Naming rationale | Disambiguated by pre-authored stacked-bar chart (slide 7). |
| Usage tier | `common` |
| Pinned chart kind | `stacked-bar` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 10 | title | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du numéro de diapositive 3 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 11 | idx:18 | x=1.350 y=7.185 w=9.411 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |
| Espace réservé du contenu 5 | — | x=7.527 y=1.775 w=5.254 h=4.865 | slot.body-right | content | Narrative / bullets beside chart |
| Espace réservé du contenu 5 | — | x=0.602 y=1.318 w=6.164 h=0.301 | slot.chart-axis-label | subtitle | Chart category/axis label strip above chart |
| Espace réservé du contenu 1 | chart | x=0.602 y=1.775 w=6.472 h=5.047 | slot.chart | chart | chart kind: stacked-bar |

### Slide 8 — `chart-clustered-column`

| Field | Value |
|-------|-------|
| Firm layout name | Title |
| Proposed `layoutId` | `chart-clustered-column` |
| Naming rationale | Disambiguated by pre-authored clustered-column chart (slide 8). |
| Usage tier | `common` |
| Pinned chart kind | `clustered-column` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 10 | title | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du numéro de diapositive 3 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 11 | idx:18 | x=1.350 y=7.185 w=9.411 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |
| Espace réservé du contenu 5 | — | x=7.527 y=1.775 w=5.254 h=4.865 | slot.body-right | content | Narrative / bullets beside chart |
| Espace réservé du contenu 5 | — | x=0.602 y=1.318 w=6.164 h=0.301 | slot.chart-axis-label | subtitle | Chart category/axis label strip above chart |
| Espace réservé du contenu 1 | chart | x=0.602 y=1.775 w=6.491 h=5.047 | slot.chart | chart | chart kind: clustered-column |

### Slide 9 — `chart-line`

| Field | Value |
|-------|-------|
| Firm layout name | Title |
| Proposed `layoutId` | `chart-line` |
| Naming rationale | Disambiguated by pre-authored line chart (slide 9). |
| Usage tier | `common` |
| Pinned chart kind | `line` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 10 | title | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du numéro de diapositive 3 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 11 | idx:18 | x=1.350 y=7.185 w=9.411 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |
| Espace réservé du contenu 5 | — | x=7.527 y=1.775 w=5.254 h=4.865 | slot.body-right | content | Narrative / bullets beside chart |
| Espace réservé du contenu 5 | — | x=0.602 y=1.318 w=6.164 h=0.301 | slot.chart-axis-label | subtitle | Chart category/axis label strip above chart |
| Espace réservé du contenu 1 | chart | x=0.602 y=1.775 w=6.248 h=5.047 | slot.chart | chart | chart kind: line |

### Slide 10 — `chart-bubble`

| Field | Value |
|-------|-------|
| Firm layout name | Title |
| Proposed `layoutId` | `chart-bubble` |
| Naming rationale | Disambiguated by pre-authored bubble chart (slide 10). |
| Usage tier | `common` |
| Pinned chart kind | `bubble` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 10 | title | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du numéro de diapositive 3 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 11 | idx:18 | x=1.350 y=7.185 w=9.411 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |
| Espace réservé du contenu 5 | — | x=7.527 y=1.775 w=5.254 h=4.865 | slot.body-right | content | Narrative / bullets beside chart |
| Espace réservé du contenu 5 | — | x=0.602 y=1.318 w=6.164 h=0.301 | slot.chart-axis-label | subtitle | Chart category/axis label strip above chart |
| Espace réservé du contenu 1 | chart | x=0.602 y=1.775 w=6.192 h=5.047 | slot.chart | chart | chart kind: bubble |

### Slide 11 — `two-columns`

| Field | Value |
|-------|-------|
| Firm layout name | Two columns |
| Proposed `layoutId` | `two-columns` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 5 | title | — | slot.title | title | — |
| Espace réservé du contenu 6 | idx:1 | x=0.602 y=1.231 w=5.906 h=5.592 | slot.body-left | content | — |
| Espace réservé du contenu 7 | idx:2 | x=6.825 y=1.231 w=5.906 h=5.592 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 3 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 8 | idx:18 | x=1.350 y=7.185 w=9.411 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

### Slide 12 — `narrative-with-sidebar`

| Field | Value |
|-------|-------|
| Firm layout name | Contrast 1 |
| Proposed `layoutId` | `narrative-with-sidebar` |
| Naming rationale | Wide left narrative column + narrow right accent column — role-semantic name for generic "Contrast 1". |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.602 y=0.382 w=9.052 h=0.691 | slot.title | title | — |
| Espace réservé du texte 2 | body | x=0.602 y=1.249 w=9.057 h=0.218 | slot.subtitle-left | subtitle | Subtitle/callout row above column |
| Espace réservé du contenu 3 | idx:2 | x=0.602 y=1.746 w=9.057 h=5.075 | slot.body-left | content | — |
| Espace réservé du contenu 5 | idx:4 | x=10.053 y=1.746 w=2.678 h=5.075 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 6 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 7 | idx:18 | x=1.350 y=7.185 w=8.304 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

### Slide 13 — `two-column-with-subheads`

| Field | Value |
|-------|-------|
| Firm layout name | Contrast 2 |
| Proposed `layoutId` | `two-column-with-subheads` |
| Naming rationale | Equal two-column split, each with a subtitle row above the body — role-semantic name for "Contrast 2". |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.602 y=0.382 w=5.901 h=0.691 | slot.title | title | — |
| Espace réservé du texte 2 | body | x=0.602 y=1.237 w=5.906 h=0.230 | slot.subtitle-left | subtitle | Subtitle/callout row above column |
| Espace réservé du contenu 3 | idx:2 | x=0.602 y=1.735 w=5.906 h=5.086 | slot.body-left | content | — |
| Espace réservé du contenu 5 | idx:4 | x=6.825 y=1.735 w=5.906 h=5.086 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 6 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 7 | idx:18 | x=1.350 y=7.185 w=5.153 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

### Slide 14 — `sidebar-callout`

| Field | Value |
|-------|-------|
| Firm layout name | Contrast 4 |
| Proposed `layoutId` | `sidebar-callout` |
| Naming rationale | Vertical title/subtitle stack in a left sidebar + wide right content pane — role-semantic name for "Contrast 4". |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.608 y=2.886 w=2.673 h=0.991 | slot.title | title | — |
| Espace réservé du texte 2 | body | x=0.602 y=4.163 w=2.673 h=0.374 | slot.body | content | — |
| Espace réservé du contenu 4 | idx:4 | x=3.888 y=1.467 w=8.853 h=5.354 | slot.body-left | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | x=3.878 y=7.185 w=6.884 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

### Slide 15 — `three-columns-and-subtitles`

| Field | Value |
|-------|-------|
| Firm layout name | Three columns and subtitles |
| Proposed `layoutId` | `three-columns-and-subtitles` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.602 y=0.381 w=12.128 h=0.692 | slot.title | title | — |
| Espace réservé du texte 2 | body | x=0.602 y=1.231 w=3.780 h=0.236 | slot.subtitle-left | subtitle | Subtitle/callout row above column |
| Espace réservé du contenu 3 | idx:2 | x=0.602 y=1.663 w=3.780 h=5.158 | slot.body-left | content | — |
| Espace réservé du contenu 5 | idx:4 | x=8.950 y=1.663 w=3.781 h=5.158 | slot.body-right | content | — |
| Espace réservé du contenu 7 | idx:20 | x=4.737 y=1.663 w=3.859 h=5.158 | slot.body-center | content | — |
| Espace réservé du numéro de diapositive 8 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 9 | idx:18 | x=1.350 y=7.185 w=9.411 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

### Slide 16 — `title-and-content`

| Field | Value |
|-------|-------|
| Firm layout name | Title and Content |
| Proposed `layoutId` | `title-and-content` |
| Usage tier | `common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | — | slot.title | title | — |
| Espace réservé du contenu 2 | idx:1 | — | slot.body-left | content | — |
| Espace réservé du numéro de diapositive 3 | sldNum | — | (auto) | footer | Page number — pipeline auto-applies |

## Tier: `less-common`

### Slide 17 — `two-columns-and-subtitles`

| Field | Value |
|-------|-------|
| Firm layout name | Two columns and subtitles |
| Proposed `layoutId` | `two-columns-and-subtitles` |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.602 y=0.382 w=12.128 h=0.691 | slot.title | title | — |
| Espace réservé du texte 2 | body | x=0.602 y=1.231 w=5.906 h=0.236 | slot.subtitle-left | subtitle | Subtitle/callout row above column |
| Espace réservé du contenu 3 | idx:2 | x=0.602 y=1.663 w=5.906 h=5.158 | slot.body-left | content | — |
| Espace réservé du contenu 5 | idx:4 | x=6.825 y=1.663 w=5.906 h=5.158 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 6 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 7 | idx:18 | x=1.350 y=7.185 w=9.411 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

### Slide 18 — `blank`

| Field | Value |
|-------|-------|
| Firm layout name | Blank |
| Proposed `layoutId` | `blank` |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Espace réservé du numéro de diapositive 1 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 2 | idx:18 | x=1.350 y=7.185 w=9.411 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

### Slide 19 — `cover-white`

| Field | Value |
|-------|-------|
| Firm layout name | Cover - white |
| Proposed `layoutId` | `cover-white` |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | ctrTitle | x=0.600 y=1.497 w=9.601 h=1.353 | slot.title | title | — |
| Sous-titre 2 | subTitle | x=0.600 y=2.943 w=9.601 h=0.571 | slot.subtitle | subtitle | — |
| Espace réservé du texte 3 | body | x=0.600 y=3.855 w=4.389 h=0.446 | slot.body | content | — |
| Espace réservé pour une image  4 | pic | x=10.923 y=0.083 w=2.123 h=1.068 | slot.image | image | — |

### Slide 20 — `section-white`

| Field | Value |
|-------|-------|
| Firm layout name | Section - white |
| Proposed `layoutId` | `section-white` |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | ctrTitle | x=0.602 y=1.251 w=7.953 h=2.611 | slot.section-title | section-title | — |
| Sous-titre 2 | subTitle | x=0.602 y=3.954 w=7.953 h=0.571 | slot.subtitle | subtitle | — |

### Slide 21 — `agenda-white`

| Field | Value |
|-------|-------|
| Firm layout name | Agenda - white |
| Proposed `layoutId` | `agenda-white` |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.602 y=0.382 w=12.123 h=0.691 | slot.title | title | — |
| Espace réservé du numéro de diapositive 2 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 3 | idx:2 | x=0.602 y=1.860 w=9.057 h=4.944 | slot.body-left | content | — |

### Slide 22 — `sidebar-callout`

| Field | Value |
|-------|-------|
| Firm layout name | Contrast 3 |
| Proposed `layoutId` | `sidebar-callout` |
| Naming rationale | Same geometry as Contrast 4 (left sidebar + right content) — shares slot vocabulary; firm name preserved as variant label. |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.608 y=2.886 w=2.673 h=0.991 | slot.title | title | — |
| Espace réservé du texte 2 | body | x=0.602 y=4.163 w=2.673 h=0.374 | slot.body | content | — |
| Espace réservé du contenu 4 | idx:4 | x=3.888 y=1.467 w=8.853 h=5.354 | slot.body-left | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | x=3.878 y=7.185 w=6.884 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

### Slide 23 — `narrative-with-sidebar-hc`

| Field | Value |
|-------|-------|
| Firm layout name | High contrast 1 |
| Proposed `layoutId` | `narrative-with-sidebar-hc` |
| Naming rationale | High-contrast styling of Contrast 1 geometry — shares slot vocabulary with `narrative-with-sidebar`. |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.602 y=0.382 w=9.052 h=0.691 | slot.title | title | — |
| Espace réservé du texte 2 | body | x=0.602 y=1.231 w=9.057 h=0.243 | slot.subtitle-left | subtitle | Subtitle/callout row above column |
| Espace réservé du contenu 3 | idx:2 | x=0.602 y=1.703 w=9.057 h=5.139 | slot.body-left | content | — |
| Espace réservé du contenu 5 | idx:4 | x=10.053 y=1.703 w=2.678 h=5.139 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 6 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 7 | idx:18 | x=1.350 y=7.185 w=8.304 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

### Slide 24 — `two-column-with-subheads-hc`

| Field | Value |
|-------|-------|
| Firm layout name | High contrast 2 |
| Proposed `layoutId` | `two-column-with-subheads-hc` |
| Naming rationale | High-contrast styling of Contrast 2 geometry — shares slot vocabulary with `two-column-with-subheads`. |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.602 y=0.382 w=5.901 h=0.708 | slot.title | title | — |
| Espace réservé du texte 2 | body | x=0.602 y=1.231 w=5.906 h=0.236 | slot.subtitle-left | subtitle | Subtitle/callout row above column |
| Espace réservé du contenu 3 | idx:2 | x=0.602 y=1.703 w=5.906 h=5.119 | slot.body-left | content | — |
| Espace réservé du contenu 5 | idx:4 | x=6.825 y=1.703 w=5.906 h=5.138 | slot.body-right | content | — |
| Espace réservé du numéro de diapositive 6 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 7 | idx:18 | x=1.350 y=7.185 w=5.153 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

### Slide 25 — `sidebar-callout-hc`

| Field | Value |
|-------|-------|
| Firm layout name | High contrast 3 |
| Proposed `layoutId` | `sidebar-callout-hc` |
| Naming rationale | High-contrast styling of sidebar-callout geometry — shares slot vocabulary with `sidebar-callout`. |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.608 y=2.886 w=2.673 h=0.991 | slot.title | title | — |
| Espace réservé du texte 2 | body | x=0.602 y=4.163 w=2.673 h=0.374 | slot.body | content | — |
| Espace réservé du contenu 4 | idx:4 | x=3.888 y=1.467 w=8.843 h=5.354 | slot.body-left | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | x=3.878 y=7.185 w=6.884 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

### Slide 26 — `sidebar-callout-hc`

| Field | Value |
|-------|-------|
| Firm layout name | High contrast 4 |
| Proposed `layoutId` | `sidebar-callout-hc` |
| Naming rationale | Same geometry as High contrast 3 — shares slot vocabulary with `sidebar-callout-hc` / `sidebar-callout`. |
| Usage tier | `less-common` |

| Current `cNvPr` name | Placeholder | Geometry (in) | Proposed slot | Region kind | Notes |
|----------------------|-------------|---------------|---------------|-------------|-------|
| Titre 1 | title | x=0.608 y=2.886 w=2.673 h=0.991 | slot.title | title | — |
| Espace réservé du texte 2 | body | x=0.602 y=4.163 w=2.673 h=0.374 | slot.body | content | — |
| Espace réservé du contenu 4 | idx:4 | x=3.888 y=1.467 w=8.843 h=5.354 | slot.body-left | content | — |
| Espace réservé du numéro de diapositive 5 | sldNum | x=12.376 y=7.185 w=0.354 h=0.120 | (auto) | footer | Page number — pipeline auto-applies |
| Espace réservé du contenu 6 | idx:18 | x=4.619 y=7.185 w=6.142 h=0.276 | (auto) | footer | Brand footer strip — pipeline auto-applies from brand.yaml |

---

## Review checklist (human)

1. Confirm each proposed `layoutId` — especially Contrast / High contrast semantic names.
2. Confirm slot names for duplicate/overlapping placeholders (Contrast layouts expose paired `body` shapes).
3. Confirm `subtitle` region kind and density caps.
4. Confirm bubble dataset contract before schema phase.
5. Approve tier assignments (common vs less-common).

**Next phase (not in scope here):** mechanical OOXML rename → Zod schemas → Layout catalogue JSON → drift test.
