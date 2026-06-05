# jayson-docs — Context

The vocabulary the team uses when talking about this codebase. Definitions are kept tight on purpose — when a term needs to be clarified, this is where the resolution lives.

This project is deliberately **minimal** — a closed, vetted layout library plus a single source of brand, filled mechanically into Office templates, and nothing more. Where a term could be read more broadly, the narrower scope is called out so nobody re-expands it.

## Language

### The core principle

**Consistency guarantee**:
The core property of this project: a *closed, vetted library of layout primitives* plus a *single source of brand*, such that the LLM only ever **fills named slots from that closed library — it never lays anything out, picks coordinates, or chooses brand values.** Output variability is zero by construction. The guarantee is enforced by a master Office template + Zod schema validation.
_Avoid_: "the consistency principle", "zero-variability" (unqualified)

**Explicitly out of scope**:
There is no canonical content model ("DocModel"), no in-app WYSIWYG editor, and no custom HTML/PDF renderer. The editor is PowerPoint/Word itself; nothing survives the deliverable as a separate content model. Re-introducing any of these is scope creep, not "minimal".
_Avoid_: "DocModel", "Renderer", "editor" (in the in-app sense) — there is no such layer here.

### Deliverables

Four skills = two **deliverable types** × two **formats**. The axes are orthogonal: *type* drives the default structure, tone, and which master template; *format* drives rendering (slides vs flowing document). Every deliverable is **composed** from sections/blocks — there is no fixed-skeleton deliverable.

**Commercial proposal**:
A pre-engagement deliverable to win the mandate — a pitch (pptx) or a written proposal (docx). **Not** a *lettre de mission*: composed from sections/blocks with a soft default structure, never a fixed legal skeleton.
_Avoid_: "lettre de mission", "contract" (the rigid-skeleton contract is out of scope — see Deferred concepts), "propale" (unqualified)

**Report**:
A delivery deliverable presenting findings and recommendations — a steering-committee / readout deck (pptx) or a written report / memo (docx).
_Avoid_: "deck" as the *type* name (a deck is the pptx *form* of a report; "deck-*" is the old skill naming, to be renamed "report-*")

### Delivery

**Skill**:
A **markdown playbook** that instructs an agentic LLM to gather a Brief, produce a schema-valid Fill-plan, and — directly (if it has tools) or via the human — invoke the app. **LLM-agnostic**: read by *any* agentic LLM, not Cowork-specific. (The four deliverable skills + the Setup skill.)
_Avoid_: "Cowork skill" (not Cowork-specific), "plugin"

**The pack**:
The portable **skills folder** (the Skills + their instructions) which, together with the standalone **app** (the local binary), is the **primary product**. A firm downloads the pack — which **bundles the per-OS app** — and points their own LLM at the folder; the LLM reads the pack and invokes the bundled app by relative path. A Cowork plugin is one *optional* packaging of the same markdown, not the only path.
_Avoid_: "the plugin" (that is the optional Cowork wrapper), "the SDK"

**BYO LLM**:
Bring-your-own-LLM: the LLM is the user's, *whatever it is* (Claude Cowork, Claude Code, Cursor, ChatGPT-with-tools, a local model). The app calls no LLM (D11) and assumes none in particular; the pack is written to be followed by any capable agentic LLM, degrading to a no-tools chat + a human-run app. **Asymmetry:** Setup *Ingestion* needs a *file-capable* agentic LLM (it crawls local documents); day-to-day *generation* degrades to a plain chat.
_Avoid_: "the model" (unqualified), assuming Cowork

**Custom skill**:
A deliverable Skill generated on demand by the **skill creator** (a meta-skill in the pack) for a firm-specific deliverable type beyond the four Built-in skills. It **composes only the frozen closed library** (layouts from the Layout catalogue, block-types, trust tiers, fill-plan schema) — it may set a new structure / tone / trigger / target master, but **never mints layouts/blocks/brand** (a layout-gap routes to Setup). Validated (a sample Fill-plan must pass Zod) + **human-gated**, then lives in the firm's **Install**. The skill-side analogue of a **User layout**.
_Avoid_: "plugin", "macro"

**Skill package**:
The unit a consultant emails to a **same-company** colleague to share a Custom skill: the `SKILL.md` + its initial-question set + a manifest, **bundling any User-layout dependencies** (as Layout packages) so it is **self-contained**. A receive-gate vets each bundled layout (`shapes ≡ slots`) and installs the skill. Within-company. Mirrors the Layout package (D17).
_Avoid_: "export bundle", "plugin"

**Standard opener**:
The shared, **suggested** opening question block every Skill asks before drafting — language · client/recipient · context · objectives · timeline (if appropriate) — plus skill-specific follow-ups. A **soft default, not mandatory**: the skill creator seeds it into every new Custom skill, but the author may review and adapt it. The prompting sequence is first-class — much of a deliverable's quality comes from asking the right questions in the right order.
_Avoid_: "intake form", "required fields"

### Library & brand

**Master template**:
The per-firm `.pptx`/`.docx` — produced at **Setup** (hand-built, or proposed by the Setup skill and then frozen) — that is the **single source of brand** *and* houses the **closed layout library**; the two are fused. **The brand is the template** — and so is the **geometry** (layouts are the master's named shapes at their real positions, *not* snapped to a design grid; D19). One master per deliverable type (four in v1). This is the load-bearing artifact of the consistency guarantee.
_Avoid_: "theme file", "skin" (the brand is not separable from the template in v1 — see Deferred concepts)

**Closed layout library**:
The fixed set of named whole-slide layouts a *pptx* master offers (e.g. `kpi-row-chart`, `two-column`, `quad`). The LLM may only pick a `layoutId` from this set — Zod rejects anything else. A mature install holds **~50–100** layouts (not the v1 seed of ~6), tiered by **Usage tier** and described in the **Layout catalogue** so the LLM can pick among them. **pptx-only**: it exists because a slide is a fixed, non-reflowing canvas. docx has *no* layout library — its counterpart is the Closed block-type set, because Word reflows and no fixed arrangements are needed. In v1 the library lives *inside* each branded master, so it is brand-fused, not brand-agnostic.
_Avoid_: "the layouts" (unqualified), "block library" (reserved for the deferred brand-agnostic version), applying it to docx

**Closed block-type set**:
The closed vocabulary of content primitives the LLM may use — prose, heading, bullets, callout, chart, table, kpi-cards, image, … — Zod-enforced. **Universal**: the same set fills pptx Slots and flows in docx Sections. The other half of the consistency guarantee, alongside the Closed layout library (pptx) and brand Word styles (docx).
_Avoid_: "block library" (deferred, brand-agnostic sense), "the blocks" (unqualified)

**Layout catalogue**:
The machine-readable, **LLM-facing index** of the closed library: per layout (and block-type) — its **Usage tier**, a **`usage`** note ("pick when…"), a **`regions`** spatial map, and density **`caps`**. The LLM reads it to **pick** the right layout for an idea and to **fill** it coherently (the `regions` map tells it, e.g., chart-left / narrative-right — awareness, not control; D8 holds). Generated at Setup, frozen in the Install. Scales the `CHART_CATALOGUE.md` pattern to the whole library.
_Avoid_: "the enum" (the catalogue is richer than the `layoutId` enum), "manifest"

**Usage tier**:
A layout/block's **commonness** — `common` / `less-common` / `rare` — with a **"prefer common, justify rare"** picking rule, so a ~50–100-entry library stays navigable and decks stay consistent. **Distinct from Trust tier** (which is confidentiality).
_Avoid_: "Trust tier" (a different axis), "priority"

**Layout origin**:
A layout's provenance (and the matching tier model for minted blocks): **Built-in** (shipped seed), **Company-approved** (minted then **reviewed**, blessed install-wide), or **User** (minted on demand by one consultant; personal, peer-shareable). A User layout can be **promoted** to Company-approved after review. **Distinct from Usage tier** (commonness) and **Trust tier** (confidentiality) — three orthogonal axes.
_Avoid_: "custom layout" (say User or Company-approved), bare "tier"

**Layout package**:
The unit a consultant emails to a **same-company** colleague to share a minted layout: the named-shape slide fragment + its Zod schema + its Layout-catalogue entry + a manifest (sender, provenance, version). On receipt a **gate** asserts `shapes ≡ slots` and brand fit → install, else **quarantine** (with a reason). **Within-company only** — same brand/master; cross-company needs the deferred brand-theme split.
_Avoid_: "plugin", "export bundle"

**Layout preferences**:
A **per-user, machine-local** overlay on the Layout catalogue that re-ranks picking — `preferred` / `deprioritized` / `banned` — kept in a personal `layout-preferences.md`. **Soft and never canonical**: it never alters the closed library, the schema, the catalogue, or a deliverable's validity. A `banned` layout drops out of *free* picking but **yields** (and flags) if it is the only valid fit for a required slot/region — preferences steer, they never break a document. Local to one consultant; not in the shared Firm context or the frozen Install.
_Avoid_: "config", "rules", conflating with Usage tier (company-wide) or Trust tier (confidentiality)

### Setup & onboarding

**Setup**:
The one-time, **per-firm** onboarding phase that produces the frozen Master template, Closed layout library, and brand — *before* any deliverable is generated. The opposite of generation (per-deliverable, at runtime): a firm does Setup once at install; deliverable skills run many times after.
_Avoid_: "configuration", "onboarding" (unqualified), conflating with deliverable-time generation

**Setup skill**:
The Skill that runs Setup (a markdown playbook, BYO LLM): it ingests the firm's existing template + a few sample decks and **proposes**, in lock-step, a named-shape Master template and the **matching** Zod layout schema. A mechanical step applies the `slot.*` names to the `.pptx`; a human reviews once; then the library is **frozen**. AI-assisted, **human-gated** — never an autonomous master generator, because the consistency guarantee cannot tolerate a silent master/schema mismatch (a validator asserts master-shapes ≡ schema-slots before freeze).
_Avoid_: "generator", "wizard", "autonomous setup"

**Setup-time AI**:
The principle that the Closed layout library and brand are AI-**proposed** once at Setup from the firm's real materials, then **frozen** — never regenerated at deliverable time. Reviewed once, closed. The setup-time counterpart to "Cowork drafts" at deliverable time.
_Avoid_: "runtime AI", "live generation"

**Install**:
The frozen, per-firm output of Setup: the Master template(s) + matching schema + brand, plus the scaffolded Firm context (`firm.md` + folders). Closed after Setup; deliverable skills consume it and never mutate it. The CLI runs against an Install **locally** (D14).
_Avoid_: "build", "package" (that's the binary), "deployment"

**Brand reconciliation**:
The Setup step that resolves conflicts between the firm's *stated* brand (their context docs) and their *actual* template. The template is canonical (D2-2), but every conflict is **surfaced for human confirmation** and `firm.md` is reconciled to the template — never a silent override. (At deliverable time the template just wins, with no human in the loop.)
_Avoid_: "brand merge", "brand sync"

**Ingestion**:
The LLM-native Setup pass in which the firm's own (file-capable) LLM reads their existing corpus — marketing, white papers, past proposals, people docs — and writes the **Firm context** (`firm.md`, `people/roster.json`, `public/*.md`, anonymised `confidential/*.md`). The **app never parses documents** (D7 holds); heavy-duty parsing (MinerU, D9) stays deferred. **Trust tiers are enforced during ingestion** (confidential sources → anonymised derivatives only). Re-runnable as the firm adds material.
_Avoid_: "import" (D7's parsing sense), "scraping", conflating with layout-clustering (that reads the *template*, this reads the *corpus*)

### Firm context & trust

**Firm context**:
The **firm-owned** folder that Cowork reads (it is *not* inside the jayson-docs install) holding the firm's identity, brand source, people, and reference materials. Scaffolded at Setup; the firm populates it over time. The generalised analogue of the Acme `kDrive/99. Acme` folder. Source material is kept in **LLM-readable formats** (markdown for prose, JSON for structured data such as people rosters) with binary **assets referenced by relative path** (logos, photos) — for readability and token efficiency.
_Avoid_: "the docs folder", "knowledge base", placing it inside the install

**firm.md**:
The single manifest at the root of the Firm context declaring the firm's identity, expertise, positioning, and the **trust map** (which folder is which Trust tier). Drafted by the Setup skill, human-edited; read by every deliverable skill. The analogue of the Acme `AGENTS.md`.
_Avoid_: "config", "readme"

**Trust tier**:
The confidentiality classification attached to each Firm-context folder and **enforced** by the deliverable skills' hard rules — not advisory. The four tiers:
- **public** — marketing, white papers, named public references → quotable verbatim.
- **internal-citable** — the firm's own people / roster → citable by name.
- **confidential** — past proposals & project deliverables → usable for structure / methodology only, client names **anonymised**.
- **brand-source** — templates / logo / fonts / master → consumed by Setup, never cited in content.
_Avoid_: "permission", "access level", "sensitivity" (unqualified)

### Content plan

**Fill-plan**:
The kind-discriminated structured JSON that Claude-in-Cowork produces and the CLI fills from. **Not canonical** — a throwaway draft input, reconstructible only by re-prompting; the Office file is the deliverable, not a projection of the fill-plan. Its body is always a list of **Sections**; in a deck (`kind: "deck"`) each section holds **Slides**, in a document (`kind: "document"`) each section holds **blocks** directly.
_Avoid_: "deck-plan" (a misnomer — half the deliverables are documents, not decks), "DocModel" (there is no canonical content model here), "the brief" (that is the human input, a different thing)

**Brief**:
The consultant's **conversational** input, gathered by a skill inside the LLM session (goal, audience, key data, outline) one short question at a time. It lives only in the LLM chat: it **never enters the codebase**, is never schema-validated here, and is *not* the Fill-plan (the Fill-plan is the structured JSON the LLM produces *from* the brief). "What a good brief contains" lives in each SKILL.md Step A.
_Avoid_: "brief input" / `briefInput` (the removed dead schema), conflating with Fill-plan

**Section**:
The **universal grouping unit** — an LLM-authored chapter/part present in *every* deliverable. Soft, not fixed: the LLM assembles sections following a Standard structure it may depart from. A Section sits *above* the layout-bearing unit — in a deck it groups one-or-more **Slides** (and feeds the `tracker` breadcrumb + numbering); in a document it groups **blocks** directly. It is **not canonical** — an authoring-time grouping, not a persisted model.
_Avoid_: "fixed section" (there are none — see Standard structure), "slide" (a section *groups* slides, it is not one)

**Slide**:
The **layout-bearing unit** in a deck, sitting *under* a Section: picks one `layoutId` from the closed slide-layout library and fills that layout's named slots, subject to density caps. A Section may hold several slides. **The LLM authors every slide explicitly — the pipeline never paginates**: if content won't fit, the LLM splits it into another slide at authoring time (a semantic op), never the system distributing blocks across slides (a spatial op — see D8 / D12). PPTX only; docx has no slide level.
_Avoid_: "page", "card", "section" (a slide sits *under* a section)

**Slot**:
A **named fillable region** inside a slide-layout (e.g. `slot.title`, `slot.chart`, `slot.kpi-strip.card1.figure`). Each slot accepts only certain block types — the region-kind → block-type table in `SLIDE_LAYOUT_LIBRARY.md`. **pptx-only**: docx has no slots; its blocks flow directly in a Section.
_Avoid_: "region", "placeholder", "field" (use "slot")

**Block**:
An instance of one type from the Closed block-type set, filled with content. In a deck it fills a Slot; in a document it flows in a Section. The atomic content unit.
_Avoid_: "element", "component", "widget"

**Standard structure**:
The recommended default sequence of sections/slides for a deliverable type — a **soft** starting outline the skill nudges the LLM toward, then prompts the consultant to add or remove sections. The complement to the closed layout library: the **library is a hard constraint** (Zod-enforced — the LLM cannot invent a layout); the **standard structure is a soft default** (skill-prompt only — the LLM may depart from it). This soft/hard split is what replaced the deck/document/contract distinction.
_Avoid_: "template structure", "fixed outline", "required sections"

## Flagged ambiguities

**"blocks / slides"** — RESOLVED. Two closed sets, not one: the **Closed layout library** (whole-slide arrangements, pptx, picked by `layoutId`) and the **Closed block-type set** (content primitives, universal). A **Slot** is a named region in a slide-layout; a **Block** is a filled block-type instance. docx has block types and Sections but no layouts or slots.

**Section vs Slide** — RESOLVED (two-level model). A **Section** is the universal grouping unit; a **Slide** is the layout-bearing unit beneath it (pptx only). A section may span multiple slides, but only because the **LLM authors them explicitly** — the **pipeline never paginates** (see DECISIONS_LOG D12). docx sections hold blocks directly (no slide level).

**Code & doc cleanup — DONE.** The repo now matches the pinned model:

- `fillPlanSchema` — `kind`-discriminated, two-level (`sections[]` → `slides[]` for decks, `blocks[]` for documents); `briefInputSchema` removed; new `src/schema/block.ts` holds the Closed block-type set.
- CLI flag `--deck-plan` → `--plan` (a fill-plan is format-neutral).
- Skills renamed `deck-*` → `report-*` (+ `report.master.*`); `commercial-proposal-docx` reframed as a composed written proposal (no contract).
- Fixtures restructured to two-level (`fixtures/valid-fill-plan.json`, `fixtures/invalid/fillplan-*.json`); brief fixtures deleted.
- `ERROR_HANDLING.md` realigned to the fill-plan and D11 (dropped the brief error class; fixed the `env`/API-key note).
- `npm run build / lint / validate / test` all green (7 schema tests).

**"the brand IS the template"** — RESOLVED. v1 keeps the brand fused into each Master template (ARCHITECTURE.md §2 / DECISIONS_LOG D2-2 stand). Factoring the brand out into a swappable theme is a deferred roadmap option, not the v1 model (see Deferred concepts).

## Deferred concepts

Discussed but intentionally not built in v1. Listed so contributors don't re-invent them.

- **docx section-layouts** — letting a docx Section pick from a closed set of arrangements (two-column, text-with-sidebar, figure-beside-text) instead of pure block flow. Not needed for v1 — Word reflow + block flow + brand styles suffice; add only if real documents need structured multi-column sections.
- **Flexgrid slide composition** — replacing the closed set of fixed slide-layouts with a runtime grid: promote the invisible 12×8 design grid (SLIDE_LAYOUT_LIBRARY) to a placement system where blocks declare row/col spans and slides are *composed* rather than *chosen*. **Pros:** far more expressive (many arrangements from few primitives); fewer pre-designed layouts to author. **Cons:** reintroduces spatial reasoning (D8 — the LLM degrades past a coarse grid, or the pipeline becomes a layout engine, against D6); trades compile-time density guarantees for runtime fit; weakens brand QA (infinite arrangements drift). Chosen against for v1 (DECISIONS_LOG D12); revisit only if the fixed-template library proves too rigid in real use.
- **Fixed-skeleton / contract deliverables (lettre de mission)** — a rigid, lawyer-shaped document where the LLM fills field *values* into a fixed clause skeleton and composes nothing (clause order/presence is legal, not stylistic). Explicitly out of scope: all v1 deliverables are composed from sections/blocks with soft defaults. If a true contract is ever needed it requires the fixed-skeleton model (likely `docx` `patchDocument` placeholders), not the composed one — do not bolt it onto the composed path.
- **Brand-theme ⊥ block-library split** — factoring the brand (fonts, colours, logo) out of the master into a swappable Office **Theme part**, so one *brand-agnostic* block/slide library can be re-skinned per consultancy instead of maintaining one fully-branded master per brand. Would replace "the brand is the template" with "the brand is the theme" and make `brand.yaml` the genuine single source. Deferred as an optional roadmap feature; v1 keeps the brand fused into each master.
- **Interactive (no-args) app launch** — giving the standalone **app** a double-click / no-args mode that opens native file-pickers (choose template · fill-plan · output) instead of printing CLI help. v1 keeps the app **flags-only and agent-invoked** — the LLM runs it by relative path from inside the pack (see `SETUP_GUIDE.md`); the non-programmer audience is assumed to have a tool-capable LLM, and the "human runs it by hand" fallback (D15) targets technical users. A file-picker stays clear of the rejected in-app editor/canvas (D1) — it picks files, it doesn't lay out — so it can be added later without touching D11. Build only if real non-programmers end up running the binary directly.
- **Agent-fetched binary to sidestep code-signing** — having a local tool-capable agent `curl`/package-manager-fetch the app at setup (command-line downloads carry no quarantine bit, so Gatekeeper / SmartScreen never fire) instead of a browser download. Considered as a way to dodge the signing/notarisation dependency (D14) and rejected for v1: signing is **provenance/trust** for a confidentiality-first product (firm IT-security sign-off), not merely a Gatekeeper prompt; the dodge serves only the local-agent audience (not the download-page or plain-chat paths) and is fragile across OS versions (macOS propagates quarantine into extracted archives). Signing stays a committed v1 dependency regardless; revisit this optimisation only after signing ships.
