# jayson-docs — Overview (canonical foundations)

The single entry point. If you read one file before contributing, read this; it
points to the detailed docs for everything below.

> **One-sentence definition.** A tool that lets a consulting firm produce
> on-brand deliverables (proposals & reports, as PowerPoint or Word) by
> describing them to an LLM: the LLM drafts structured content, and a small
> deterministic **app** mechanically fills the firm's own Office template. **No
> LLM lives in the codebase** — it is the user's (BYO LLM).

---

## 1. The one principle — the *consistency guarantee*

A **closed, vetted library of layouts** + a **single source of brand**, so the LLM
only ever **fills named slots — it never lays anything out, picks coordinates, or
chooses brand values.** Output variability is zero by construction. This is the
project's one non-negotiable idea (D1); everything else serves
it. The explicit *no*: no canonical DocModel, no in-app editor, no custom renderer.

## 2. Lifecycle — four phases

| Phase | Who | What | Spec |
|---|---|---|---|
| **Setup** (once/firm) | LLM proposes, **human gates** | firm's template + sample decks → propose named master + matching schema → script applies `slot.*` names → validate `shapes ≡ slots` → freeze (**the Install**) | D13, `SETUP_PIPELINE.md` |
| **Ingestion** (part of Setup) | LLM (file-capable) | read firm's corpus → write **Firm context** (md/JSON); app never parses (D7) | D13, `SETUP_PIPELINE.md` |
| **Generation** (many) | LLM (any, incl. plain chat) | Standard opener → brief → schema-valid **Fill-plan** → invoke app (or human runs it) | D15, `SKILL_AUTHORING.md` |
| **Delivery / fill** | the **app** (deterministic) | fill the master's named shapes → native `.pptx`/`.docx`, edited in Office | D4, `BUILD_BRIEF.md` |

## 3. Deliverables & extensibility

- **Built-in:** `{commercial proposal, report} × {pptx, docx}` = 4 skills. All
  **composed** from sections/blocks with a *soft* standard structure — **no
  fixed-skeleton contract**.
- **Custom (open-ended):** a **skill creator** generates new deliverable types
  that **compose** the closed library (never expand it); layout-gaps route to
  Setup. Validated + human-gated, stored in the Install. (D18)

## 4. Content model

- **Fill-plan** — non-canonical JSON, discriminated on `kind`. Two-level:
  **Section** (universal grouping → tracker) ⊃ **Slide** (pptx, picks a
  `layoutId`) / **blocks** (docx, flow). (D12)
- **Two closed sets:** **layout library** (pptx slide-layouts — *fixed
  templates, not a flexgrid*, D12) + **block-type set** (universal). **Slots** are
  pptx-only; docx reflows (Word paginates; **the pipeline never paginates**).
- Density **caps** are compile-time (Zod). The LLM splits content semantically;
  the system never packs slides spatially (D8).

## 5. The library and its catalogue — three orthogonal axes + a personal overlay

A mature install holds **~50–100 layouts** (+ many block-types), made navigable by
the **Layout catalogue** (D16) — per entry: `usage` ("pick when…"), `regions`
(spatial map, for smart fill), `caps`, and a **Usage tier**. The LLM reads it to
**pick** and **fill**. Three orthogonal classifications, plus one local overlay:

| Axis | Values | Purpose |
|---|---|---|
| **Usage tier** | common / less-common / rare | pickability — *prefer common, justify rare* (D16) |
| **Layout origin** | Built-in / Company-approved / User | provenance & trust (D17) |
| **Trust tier** | public / internal-citable / confidential / brand-source | confidentiality of Firm-context material |
| *Layout preferences* | preferred / deprioritized / banned | **per-user, machine-local** re-ranking; soft, never breaks a doc |

## 6. Extensibility & sharing

- **Minting layouts** reuses Setup's `shapes ≡ slots` gate, scoped to one layout.
  **User** layouts can be **promoted** to **Company-approved** after review. (D17)
- **Peer sharing by email**, **within-company only** (same brand/master):
  a **Layout package** or **self-contained Skill package** (bundles its User-layout
  dependencies) → **receive-gate** asserts `shapes ≡ slots` + brand fit →
  install, else **quarantine**. Cross-company waits for the brand-theme split. (D17, D18)

## 7. Brand & confidentiality

- **"The brand IS the template"** (v1, D2-2) — fused. Setup
  **surfaces-then-reconciles** stated-brand vs template (template canonical).
- **Trust tiers** are first-class and **skill-enforced** — what stops a past
  client's name leaking into a new deliverable.

## 8. Delivery & execution

- **Portable skills pack + standalone signed binary, BYO LLM** (any agentic LLM);
  Cowork plugin is *one optional packaging*. (D15)
- **Local execution** — confidential materials never leave the machine; the LLM
  only orchestrates. (D14)

## 9. Decision index (D1–D21)

| # | Decision |
|---|---|
| D1 | Template-fill over bespoke React/TipTap |
| D2 / D3 | pptx-automizer + PptxGenJS (PPTX) · dolanmiu/docx (DOCX); template/brand canonical (D2-2) |
| D4 / D5 / D6 | Office is the editor · native editable output · no custom HTML/PDF renderer |
| D7 / D8 | No runtime Office parsing · no free-canvas LLM placement |
| D9 / D10 | No source ingestion in v1 (MinerU→v3) · single-render-engine principle dropped |
| D11 | LLM is the user's; **no LLM call in this codebase** (delivery revised by D15) |
| D12 | Fixed slide templates over flexgrid; two-level body; never paginate |
| D13 | Setup = AI-assisted, **human-gated** |
| D14 | Local **signed binary**; confidential stays local |
| D15 | Portable pack + app (BYO LLM); plugin optional |
| D16 | Annotated **Layout catalogue** + Usage tiers; library scales to ~50–100 |
| D17 | **Layout origin** tiers + within-company email transport (package → gate → quarantine) |
| D18 | **Skill creator** → Custom skills (compose, not expand); self-contained transport; Standard opener |
| D19 | Layout **geometry is canonical from the master**, not snapped to a design grid (grid retained only for the deferred flexgrid) |

## 10. Stack

Pure-JS (→ clean cross-platform binary): **pptx-automizer** `~0.8` (only `0.x`,
tight-pinned) · **pptxgenjs** 4 · **docx** 9 · **zod** 4 · **yaml** · **commander**
15. Dev: TypeScript 6 · Vitest 4 · ESLint 9 (flat) · tsx. Node ≥22 (`.nvmrc` 24).

## 11. Roadmap (consolidated)

- **v1 (now):** report-pptx walking skeleton on Acme's master → fill pipeline →
  the four Built-in skills.
- **v1.x / v2 — extensibility & growth:** grow the catalogue toward ~50–100
  layouts; Setup generalizes to a second firm; skill creator; layout minting +
  within-company sharing; per-user preferences.
- **Deferred / optional (each its own trigger):** brand-theme ⊥ library split
  (also unlocks **cross-company** sharing) · flexgrid · docx section-layouts ·
  fixed-skeleton contracts (lettre de mission) · MinerU ingestion (v3) ·
  standalone API path (v3). See `CONTEXT.md` → Deferred concepts, `ARCHITECTURE.md` §8.
- **Open question:** generations/consultant/day — if high, Cowork quota bites and
  the v3 standalone-API path moves up.

## 12. Open dependencies & build order

- **External blocker:** code signing/notarization (Apple + Windows certs) for the
  non-programmer binary (see D14).
- **Fragility:** `pptx-automizer` is the only `0.x` dep and load-bearing
  (tight-pinned).
- **Build order:** **report-pptx walking skeleton first** (proves the fill
  pipeline on Acme's hand-built master) → then Setup generalizes to other firms.
  The 4 masters don't exist yet; only 1 of 6 seed layout schemas is written.

## 13. Document map

| Topic | File |
|---|---|
| **This overview** | `OVERVIEW.md` |
| Glossary (canonical terms) | `CONTEXT.md` |
| Why + diagram + roadmap | `docs/ARCHITECTURE.md` |
| Decisions D1–D21 | `docs/DECISIONS_LOG.md` |
| Milestones | `docs/BUILD_BRIEF.md` |
| Slide layouts + catalogue | `docs/SLIDE_LAYOUT_LIBRARY.md` |
| Chart shapes · error policy | `CHART_CATALOGUE.md` · `ERROR_HANDLING.md` |
| Setup skill spec | `docs/SETUP_PIPELINE.md` |
| Non-programmer setup | `docs/SETUP_GUIDE.md` |
| Skill authoring + Standard opener | `docs/SKILL_AUTHORING.md` |
| Firm-context scaffold | `firm-context-template/` |
| Agent / build rules | `AGENTS.md` |
