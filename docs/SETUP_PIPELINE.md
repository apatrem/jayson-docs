# Setup Pipeline — how the Setup skill works

**For:** the developer implementing the Setup skill.
**Decision of record:** `DECISIONS_LOG.md` **D13** (setup is AI-assisted, human-gated)
and **D14** (local signed binary; confidential materials stay local).
**Glossary:** see `CONTEXT.md` → *Setup, Setup skill, Setup-time AI, Install,
Firm context, firm.md, Trust tier, Brand reconciliation*.

---

## 0. What Setup produces

Setup is the **one-time, per-firm** phase that turns a firm's existing materials
into a frozen **Install** the deliverable skills can run against:

- one **named-shape Master template** per deliverable format (`.pptx`, `.docx`),
- the **matching Zod layout schema** (in lock-step with the master's shape names),
- the **brand** (derived from the template, canonical),
- a scaffolded **Firm context** (`firm.md` + `brand/ people/ public/ confidential/`).

Setup never runs at deliverable time. Once frozen, the Install is closed.

## 1. The load-bearing invariant

> **master shapes ≡ schema slots.**

The consistency guarantee depends on the Zod schema mirroring the master's
named shapes *exactly*. Everything below exists to produce that pair correctly
and to **prove** it before freezing. The LLM may *propose*; only a passing
validator + a human approval may *freeze*.

## 2. Inputs

- The firm's **template(s)** (`brand/`): `.pptx` / `.docx`.
- **3–5 sample decks/documents** (representative real work).
- Optional **stated brand / context docs** (style guide, an existing `AGENTS.md`).

## 3. Pipeline stages

Each stage is labelled **[AI]** (Claude-in-Cowork proposes) or **[mech]**
(deterministic code — no LLM). The generative/mechanical split is what keeps
this clear of D8 (LLMs are bad at spatial reasoning).

### Stage 1 — Ingest  [mech]
Read the template's theme part (colour scheme, font scheme, logo) and unzip the
sample decks. Extract, per slide: shape inventory, geometry, and text density.
No LLM yet — this is OOXML parsing.

### Stage 2 — Cluster layouts  [AI]
Give the LLM the inventory from Stage 1. It clusters recurring slide
arrangements into a **proposed closed layout library** (target ~6–10 layouts,
per `SLIDE_LAYOUT_LIBRARY.md`). Output: a list of layouts, each with its
regions and the block types each region accepts.

### Stage 3 — Propose master + schema (lock-step)  [AI]
For the proposed library, the LLM emits **two artefacts together**:
- a **slot-naming plan**: for each layout, the `slot.*` name for every fillable
  shape (`slot.title`, `slot.kpi-strip.card1.figure`, …); and
- the **matching Zod schema** (one file per layout, wired into the discriminated
  union) — density caps included.
These must be generated as one unit so names and schema cannot drift.

### Stage 4 — Apply slot names  [mech]
A script rewrites the template's OOXML: set each shape's `<p:cNvPr name="…">` to
the planned `slot.*` name, and arrange one template slide per layout. **No
freehand LLM editing of the `.pptx`** — the rename is deterministic from Stage 3's
plan. Produces the candidate named master.

### Stage 5 — Validate + reconcile  [mech]
- **shapes ≡ slots:** assert the candidate master's `slot.*` shapes are exactly
  the set the schema expects — no missing, no extra. Fail → back to Stage 3.
- **Brand reconciliation:** compare brand derived from the template against any
  *stated* brand. Template is canonical (D2-2); **surface every conflict** for
  the human (Stage 6) rather than overriding silently.

### Stage 6 — Human review → freeze  [human]
Present to the firm: the proposed layouts (rendered), the slot names, and the
brand conflicts. The human approves, edits, or rejects. **Only on approval** is
the Install written and **frozen**. No autonomous freeze, ever.

### Stage 7 — Ingest the corpus → Firm context  [AI]
Copy the `firm-context-template/` structure, then the LLM **ingests the firm's
corpus** (marketing, white papers, past proposals, people docs) and writes the
Firm context: `firm.md` (identity, expertise, people, brand, **Trust map**),
`people/roster.json`, `public/*.md`, and **anonymised** `confidential/*.md`
methodology notes — for the human to edit.

- **LLM-native, app parser-free.** The LLM reads documents with its *own*
  document-reading; the **app never parses** `.pdf`/`.pptx`/`.docx` (D7 holds).
  Heavy-duty parsing (**MinerU, D9**) stays the deferred option for large corpora.
- **Output is LLM-readable.** Markdown for prose, JSON for structured data
  (`roster.json`); binary **assets referenced by path** (logos, photos), not
  embedded — for readability and token efficiency.
- **Trust tiers enforced during ingestion.** From `confidential/` sources the LLM
  writes only anonymised derivatives (sector / geography / year, no client name).
- **Requires a file-capable LLM** (it crawls local documents) — unlike generation,
  which degrades to a plain chat. **Re-runnable** as the firm adds material.

## 4. Outputs (the Install)

```
<install>/
  templates/                 # named masters: <deliverable>.master.{pptx,docx}
  src/schema/layouts/        # generated Zod layout schemas (lock-step with masters)
  brand/                     # resolved canonical brand
  firm-context/              # firm.md + brand/ people/ public/ confidential/
```

## 5. Guardrails (non-negotiable)

- **Human-gated.** The LLM proposes; a human freezes. No autonomous master.
- **shapes ≡ slots** must pass before freeze (Stage 5).
- **Generative ⊥ mechanical.** The LLM never edits the `.pptx` directly; a script
  applies its plan (Stage 4). Keeps Setup clear of D8.
- **Template canonical for brand** (D2-2); conflicts surfaced, not hidden.
- **Local only** (D14). Setup reads the firm's confidential materials on the
  firm's machine; nothing is uploaded.
- **App stays parser-free** (D7). Ingestion (Stage 7) uses the LLM's own
  document-reading; the app never parses Office/PDF. MinerU (D9) is the deferred
  heavy option.
- **Setup needs a file-capable LLM** (BYO LLM): it crawls local documents, unlike
  generation, which degrades to a plain chat.

## 6. Not yet decided

- **Layout-clustering quality bar** — how many sample decks, and the accept
  threshold before a layout is proposed.
- **Regeneration** — when the firm later changes their template, does Setup
  re-run fully or diff against the frozen Install?
- **docx section-layouts** — Setup currently proposes slide-layouts (pptx);
  the docx side is flowing blocks + Word styles (see `CONTEXT.md` Deferred).
