# Acme jayson-docs — Architecture

**Audience:** the developer who will build and maintain this system
**Date:** 2026-06-05 (updated through D19 — BYO-LLM delivery, signed binary, geometry-canonical layouts)
**Status:** design proposal, ready for autonomous implementation
**Supersedes (conceptually):** a bespoke React/TipTap document-editor approach — evaluated and rejected (see `DECISIONS_LOG.md` D1)

---

## 1. Purpose

Let strategy consultants at Acme produce four kinds of client deliverables:

- **commercial proposal — PPTX** (pitch deck for winning a project)
- **commercial proposal — DOCX** (written proposal — the document form of the pitch)
- **report — PPTX** (delivery deck shown during or at the end of an engagement)
- **report — DOCX** (written report / memo form of a delivery)

…that are visually consistent and anchored on Acme's hand-designed Office templates, partly drafted by Claude-in-Cowork from a structured brief, and editable per the existing consulting workflow (PowerPoint and Word with track-changes, comments, team co-authoring, think-cell, Excel-linked charts).

This memo captures the architecture chosen after evaluating a bespoke React/TipTap document system (rejected — see `DECISIONS_LOG.md` D1). The selected approach is a **template-fill app driven by a portable skills pack**, with the user's **own** agentic LLM (BYO LLM — Cowork, Claude Code, Cursor, …; see D15) supplying the LLM step and the app doing pure mechanical fill.

---

## 2. The one principle

**Cowork drafts, templates anchor, Office edits.** Three stages, each doing what it is best at.

- **Claude-in-Cowork** produces structured content (a schema-valid fill-plan JSON) in its own context. The user's Cowork subscription is the LLM. No layout, no coordinates — Claude picks a `layoutId` from a closed library and fills typed slots.
- A hand-designed `.pptx` / `.docx` master template defines the visual identity. The brand *is* the template.
- A small Node CLI opens the template, fills named shapes / placeholders, and saves a native Office file. **No LLM call in this codebase.**
- The consultant opens the file in PowerPoint or Word and finalises it through the existing workflow.

Output variability is zero by construction (the template is the brand). Consultants do not learn a new editor (it is PowerPoint or Word). Claude is used only for what it does well (draft structured content). Clients receive native, editable Office files. No API key, no per-token charge — the user's existing Cowork subscription is the substrate.

---

## 3. Scope

- **v1 — four skills**: commercial-proposal-pptx, commercial-proposal-docx, report-pptx, report-docx.
- **v2 — additional templates** as Acme defines them (steering committee deck, executive memo, etc.).
- **v3 (optional) — MinerU upstream** for source-material ingestion (parse client PDFs / prior decks into LLM context).

Interactive HTML, embedded live models, in-app comment-to-AI, a custom WYSIWYG editor, **and any standalone (non-Cowork) LLM path** are not built. If a non-Cowork batch or scheduled-generation path is later needed, an `@anthropic-ai/sdk` route can be added behind a flag — additively, not as a replacement.

---

## 4. The architecture

*(Cowork is shown below as the example LLM; per `DECISIONS_LOG.md` D15, any agentic LLM drives the pack — BYO LLM.)*

```
┌──────────────────────────────────────────────────────────────────────┐
│ Consultant in Cowork                                                  │
│   describes the deliverable (brief, key data, optional source files) │
└───────────────────┬──────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Cowork skill (one of four)                                            │
│   loaded into Claude's context from skills/<deliverable>/SKILL.md    │
│   instructs Claude to: read the per-skill schema, gather missing     │
│   inputs from the user, produce a schema-valid fill-plan JSON,       │
│   write it to a temp file, invoke the CLI                            │
└───────────────────┬──────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Claude-in-Cowork                                                      │
│   produces the fill-plan JSON in its own context, using the user's   │
│   Cowork subscription. No external API call, no API key.             │
└───────────────────┬──────────────────────────────────────────────────┘
                    │  (fill-plan JSON written to project-relative tmp/...)
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLI: `./jayson-docs fill --template ... --plan ... --out ...`         │
│   1. read fill-plan from disk                                        │
│   2. validate with Zod (fillPlanSchema)                              │
│   3. dispatch on --template extension:                               │
│        .pptx  →  pptx-automizer + pptxgenjs                          │
│        .docx  →  docx (dolanmiu) patchDocument + native charts       │
│   4. save output                                                      │
└───────────────────┬──────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Consultant in PowerPoint / Word                                       │
│   - edits as needed (text, charts, slide order)                      │
│   - reviews with team via SharePoint co-authoring / track-changes    │
│   - delivers to client as native Office files                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Open-source stack

Full build / runtime stack is open source. **No proprietary dependency** — even the LLM is reached via Cowork rather than via an API key.

| Component | Role | Licence |
|---|---|---|
| **pptx-automizer** | PPTX template-based composition | MIT |
| **pptxgenjs** | PPTX from-scratch + native chart generation | MIT |
| **docx** (dolanmiu) | DOCX template-fill + native chart generation | MIT |
| **zod** | Schema definition + fill-plan validation | MIT |
| **yaml** | brand.yaml parsing | MIT |
| **commander** | CLI argument parsing | MIT |
| **TypeScript**, **vitest**, **eslint**, **prettier**, **tsx** | dev | MIT / Apache |

For v3 source-material ingestion: **MinerU** (OpenDataLab, open source) — parses PDF / DOCX / PPTX / images into Markdown / JSON, used upstream of Claude when the user wants generation grounded on prior materials.

**Not used / explicitly rejected:** docxtemplater (paid chart module), Typst, WeasyPrint, Paged.js, TipTap / TipTap Pro, React, Playwright, any custom HTML or PDF renderer, **and `@anthropic-ai/sdk`** (since there is no LLM call in this codebase). See `DECISIONS_LOG.md`.

---

## 6. How each constraint is satisfied

| Constraint | How it is satisfied |
|---|---|
| Anchor the template — zero output variability | Master `.pptx` / `.docx` is the brand. Claude never lays anything out; it only fills slots. |
| Easy for an LLM to generate | Claude emits a flat JSON keyed by slot name, constrained by Zod. No structure to invent. |
| Easy to point at specific text / item for LLM edits | Every editable thing has a stable name. Edit one slot, regenerate. |
| Native DOCX / PPTX export | Produced by the pipeline — native, editable, not images. |
| Open-source only, no separate vendor cost | The CLI uses only OSS libraries; the LLM is the user's existing Cowork subscription. |
| Strategy consulting workflow | Editing happens in PowerPoint and Word; the system does not replace it. |

---

## 7. Explicit trade-offs accepted

- **No standalone (non-Cowork) usage in v1.** The tool requires Claude-in-Cowork to produce the fill-plan; the CLI alone is not useful without a fill-plan JSON. Acceptable because the target audience already has Cowork.
- **Cowork session quota / rate limits apply** to every generation, since the LLM call counts against the user's session — no separate per-token bill, but no separate quota either.
- **No interactive HTML deliverables, no embedded live models.** Out of scope.
- **No PDF as a first-class output.** PDF is whatever PowerPoint / Word exports.
- **No round-trip from edited Office back into the system.** The fill-plan is the draft source; the Office file is the deliverable.
- **Structural variability has a per-template ceiling.** New deliverable shapes need a new master template + a new skill.

---

## 8. Roadmap

1. **v1 — four skills**: each end-to-end (brief → fill-plan → CLI → file → opens in Office). 2–4 weeks of build. The brand is fused into each master template ("the brand is the template", §2).
2. **v2** — additional templates, additional layouts inside existing templates.
3. **v3 (optional)** — MinerU upstream ingestion; a standalone CLI path with API key for batch / scheduled / non-Cowork use, added behind a flag.
4. **Optional / deferred — brand-theme ⊥ block-library split**: factor the brand (fonts, colours, logo) out of the master into a swappable Office **Theme part**, so one brand-neutral block/slide library can be re-skinned per consultancy instead of one fully-branded master per brand. Would revise §2 from "the brand is the template" to "the brand is the *theme*" and make `brand.yaml` the genuine single source. **Not in v1** — v1 keeps the brand fused into each master.
5. **Optional / deferred — flexgrid slide composition**: promote a 12×8 placement grid (retained *only* for this deferred option, **not** a v1 layout-design discipline — D19) to a runtime placement system where blocks declare row/col spans, instead of the closed set of fixed slide-layouts. *Pro:* far more expressive, fewer pre-designed layouts to author. *Con:* reintroduces spatial reasoning (D8) — the LLM degrades past a coarse grid, or the pipeline becomes a layout engine (against D6); compile-time density guarantees become runtime fit; brand QA weakens. **Not in v1** — v1 uses fixed slide templates (see `DECISIONS_LOG.md` D12).
6. **Per-firm Setup (multi-firm onboarding)** — the **Setup skill** + a signed local binary + a **Firm-context** scaffold that let a *second* firm onboard: import their template + sample decks → AI-proposed named master + matching schema → human review → freeze (the **Install**). Confidential firm materials stay local; Cowork orchestrates only. Follows the report-pptx walking skeleton (which proves the pipeline on Acme's master first). See `DECISIONS_LOG.md` D13, D14; **brand source-signing (D14) is a real onboarding dependency**.

---

## 9. Risks

- **Template design is load-bearing.** Each master defines the brand and the closed layout / section library. Bad templates → bad output. Budget design time per template.
- **Schema drift.** Each master change requires a schema update in lock-step. Keep schemas in the same repo and version both together.
- **Cowork token consumption.** Heavy daily generation will eat into session quota. Watch for it; if it bites, the standalone-CLI-with-API-key path (deferred) becomes a v3 option, not a redesign.
- **Single-maintainer risk.** Lower than the bespoke system: small codebase (hundreds of LOC), stable deps. Keep it boring.
