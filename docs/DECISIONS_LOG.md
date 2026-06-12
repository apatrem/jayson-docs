# Architecture Decisions Log — Acme jayson-docs

**Date:** 2026-06-10 (updated through D25 — Anthropic pptx skill: reference + benchmark, never a component)
**Why this file:** so the developer and future maintainers understand what was decided, what was rejected, and why. Prevents re-litigating settled questions.

---

## D1 — Template-fill pipeline over bespoke React / TipTap document system

**Decided:** template-fill (PptxGenJS + pptx-automizer for PPTX; dolanmiu/docx for DOCX) over a hand-designed master template.
**Rejected:** bespoke React + TipTap + DocModel + custom HTML / PDF renderer.

**Reason:** the bespoke system would compete with PowerPoint and Word as the editing surface. Consultants already live in Office; a custom WYSIWYG would need to be 10× better than PowerPoint to justify the behaviour change. Template-fill respects the workflow: LLM drafts, templates anchor, Office edits. Build cost: weeks vs months. Single-maintainer-rot risk much lower.

---

## D2 — PptxGenJS + pptx-automizer over docxtemplater for PPTX

**Decided:** PptxGenJS (from-scratch + native charts) used together with pptx-automizer (template-based slide injection).
**Rejected:** docxtemplater for PPTX.

**Reason:** docxtemplater's chart module is paid; PptxGenJS supports native PowerPoint charts for the *deferred* from-scratch build route with no paid module; pptx-automizer integrates with PptxGenJS by design (issue #60; `generate-pptxgenjs-charts.test.ts`). Both libraries are MIT and active. **v1 (D21):** charts are automizer data-swaps into pre-authored master charts only — PptxGenJS build is deferred. PptxGenJS 4.x has **no** waterfall build API; waterfall is supportable in v1 only if pre-authored in the master and automizer can swap `chartEx` data.

### D2-1 — `colors.primary` = `#00C259`, fonts = Futura + Arial

Brand source-of-truth resolved to the values in the actual PowerPoint / Word templates (per `src/brand/brand.yaml`), not the documented values in `CLAUDE.md` / `AGENTS.md`. The templates are what clients see.

### D2-2 — Brand precedence: master template > `brand.yaml` (derived mirror) > prose docs

The **master template is the canonical ground truth** for brand (it is what clients see). **`src/brand/brand.yaml` is a derived, validated mirror** of those values, for code paths that need tokens (the footer confidentiality notice, fonts, and chart colours for the *deferred* from-scratch build route). Precedence: **template > `brand.yaml` > prose docs** — "brand.yaml wins" means it beats narrative docs (CLAUDE.md / AGENTS prose), never the template, which `brand.yaml` itself mirrors. A loader (`src/brand/load.ts`) parses + Zod-validates it. **Charts:** since v1 swaps data into pre-authored master charts (D21), the **master chart's own styling is authoritative in v1**; `brand.yaml` chart colours apply only to the deferred PptxGenJS route.

---

## D3 — dolanmiu/docx over docxtemplater for DOCX

**Decided:** dolanmiu/docx + `patchDocument` API for DOCX template-fill (text, blocks, placeholders).
**Rejected:** docxtemplater for DOCX (paid chart module).

**Reason:** MIT, fully open source; `patchDocument` placeholder replacement without a paid module. docxtemplater is the more polished *templater*; dolanmiu/docx is the more polished *generator* for flowing document composition.

> **Revised by D21 — DOCX charts:** dolanmiu/docx has **no** native Word chart classes. DOCX is **out of v1** (D20). When DOCX returns, chart options are logged in D21 (PPT copy-paste route or paid docxtemplater chart module). D3 stands for *choosing dolanmiu/docx for DOCX fill* — not for promising in-tree Word chart generation.

---

## D4 — Microsoft Office as the editor

**Decided:** consultants edit the generated `.pptx` / `.docx` in PowerPoint / Word.
**Rejected:** in-app WYSIWYG (TipTap / ProseMirror), in-app comment-to-AI feature, custom slide canvas.

**Reason:** Office is where the workflow already lives. The "highlight + comment-to-AI" feature is replaced by the existing workflow: leave a Word / PowerPoint comment, re-prompt Claude-in-Cowork with the marked-up draft.

---

## D5 — Read-only output requirement lifted

**Decided:** native `.pptx` / `.docx` are the deliverables; clients can edit.
**Reversed:** the earlier "read-only PDF / HTML only" handoff.

**Reason:** B2B consulting clients expect editable Office files. PDF is exported from the same file on demand.

---

## D6 — No custom HTML or PDF renderer

**Decided:** no custom rendering layer.
**Rejected:** Playwright + Chromium HTML→PDF, Typst, WeasyPrint, Paged.js.

**Reason:** outputs are native Office files; PDF export goes through PowerPoint / Word.

---

## D7 — No DOCX / PPTX import or parsing at runtime

**Decided:** the system never parses Office files at runtime.
**Rejected:** OOXML import, Office round-trip parsing, MinerU at runtime in v1.

**Reason:** masters are read once by `pptx-automizer` / `docx` at fill time — that is not parsing in the import sense. Briefs come from Cowork as JSON. If source-material ingestion is later needed, MinerU is the right tool as v3 — separate stage, not embedded.

---

## D8 — No free-canvas or free-coordinate placement by the LLM

**Decided:** Claude picks a `layoutId` from a closed library and fills named slots.
**Rejected:** Claude placing elements freely on a canvas, on a fine grid, or anywhere not predefined.

**Reason:** LLMs are structurally bad at spatial reasoning. Closed layouts + named slots remove the spatial problem rather than ask the LLM to solve it. Practical ceiling: 12×8 named-region grid; finer grids degrade reliably.

---

## D9 — No upstream source-material ingestion in v1

**Decided:** v1 generates from a brief produced in the Cowork chat only.
**Deferred to v3:** MinerU (OpenDataLab) for parsing PDF / DOCX / PPTX / images into Markdown / JSON for LLM context.

---

## D10 — Single-rendering-engine principle no longer applies

The "one engine renders HTML and prints PDF" principle (which ruled out Typst and demoted WeasyPrint) was a property of the rejected bespoke architecture. Under template-fill there is no in-system rendering — PowerPoint and Word render the outputs. The divergence problem moves into Office, where it is solved.

---

## D11 — Claude-in-Cowork is the LLM; no LLM call in this codebase

**Decided:** the LLM step happens in a Cowork chat, using the user's existing Cowork subscription. The CLI accepts a *fill-plan JSON* and does pure template-fill. The codebase has **no** `@anthropic-ai/sdk` dependency, no API key handling, no environment variable for LLM auth.
**Rejected:** an in-tree standalone CLI that calls Claude via API key.

**Reason:**

- The target audience already has Cowork; an additional API-key flow would be friction for no gain.
- A Claude subscription does not include API credits — "use the user's subscription" can only mean "have Cowork make the LLM call," not "have the standalone tool call the API on behalf of the user." This is the architecturally honest path.
- The CLI becomes simpler: pure mechanical fill, fewer milestones, no LLM-call retries / token caps / model selection.
- The tool is delivered as a **Cowork plugin with four skills** (commercial-proposal-pptx, commercial-proposal-docx, report-pptx, report-docx). Each skill instructs Claude to gather a brief, produce the fill-plan, and shell out to the CLI.

**Acknowledged trade-off:** the tool is only usable inside Cowork. Headless / batch / scheduled / non-Cowork paths would require adding back an LLM client + API key. That is deferred to v3, additively (behind a flag), not as a replacement.

> **Revised by D15** — delivery is now a portable skills pack + app driven by **any** agentic LLM (BYO LLM); the Cowork plugin is one optional packaging. D11's *core* (no LLM call in this codebase) stands; the "only usable inside Cowork" limitation is lifted.

---

## D12 — Fixed slide templates over a flexgrid; two-level body model; the pipeline never paginates

**Decided:** the closed slide-layout library is a set of **fixed, pre-designed whole-slide templates** (`kpi-row-chart`, `quad`, `two-column`, …). The LLM picks a `layoutId` and fills named slots. The fill-plan body is a **two-level model** — Sections group Slides (`Section ⊃ Slide`) — and a section may span several slides **only because the LLM authors each slide explicitly**. **The pipeline never paginates**: it never distributes blocks across slides or decides where a slide breaks.
**Rejected (deferred):** a **flexgrid** — promoting the invisible 12×8 design grid to a runtime placement system where blocks declare grid spans and slides are *composed* rather than *chosen*.

**Reason:** fixed templates keep the consistency guarantee mechanical and cheap — static named-shape fill (pptx-automizer fills by name), compile-time density caps (Zod), designer-approved brand on every layout, and no spatial reasoning anywhere (honours D8). A flexgrid is more expressive but reintroduces exactly the spatial reasoning the architecture exists to avoid: either the LLM places blocks on a grid (degrades past a coarse grid — D8) or the pipeline packs them (a layout engine — against D6 and "pure mechanical fill"), and overflow becomes a runtime fit problem instead of a compile-time guarantee.

**Trade-off accepted:** expressiveness is bounded by the layout library — a genuinely new arrangement is ~30 min of design + schema work, not a runtime capability. If that rigidity bites in real use, the flexgrid option is on the roadmap (ARCHITECTURE §8) with these pros/cons; it is a deliberate, additive-not-redesign future.

**Corollary:** if content doesn't fit a slide, the *LLM* splits it into another slide at authoring time (a semantic operation it is good at), never the pipeline (a spatial operation it is bad at).

---

## D13 — Setup is AI-assisted but human-gated (setup-time AI, reborn)

**Decided:** a per-firm **Setup** phase, run by a Cowork **Setup skill**, ingests the firm's existing template + a few sample decks and *proposes* — in lock-step — a named-shape Master template and the matching Zod layout schema. A mechanical step writes the `slot.*` names into the `.pptx`; a human reviews once; a validator asserts master-shapes ≡ schema-slots; then the closed library is **frozen**.
**Rejected:** (a) hand-designing every master by hand (the prior assumption in `SLIDE_LAYOUT_LIBRARY.md` — too slow per firm, doesn't scale to many firms); (b) fully **autonomous** master generation (the consistency guarantee cannot tolerate a silent master/schema mismatch).

**Reason:** uses the **setup-time AI** principle (generate from demo materials, then freeze), retargeted at `.pptx` + Zod. Real firm decks are messy (the Acme template carries 22 layouts, Google-imported shapes, and a live `#1BB071`-vs-`#00C259` brand conflict), so the LLM must *propose*, not decide. Brushes against D8 (LLMs are bad at spatial reasoning) — mitigated by splitting **generative** (propose the taxonomy, slot names, and schema) from **mechanical** (a script writes the names into OOXML; no freehand LLM layout).

---

## D14 — The CLI runs locally as a signed standalone binary; confidential materials never leave the machine

**Decided:** the CLI executes **on the user's machine** as a **standalone, code-signed, per-OS binary** (macOS + Windows; the pure-JS dependency stack makes single-executable packaging clean — Node SEA / `bun --compile`). The Firm context (including `confidential/`) stays local; Claude-in-Cowork only orchestrates (gathers the brief, drafts the fill-plan, runs skills).
**Rejected:** running the CLI in Cowork's cloud sandbox (would require uploading the firm's confidential past proposals / project deliverables to render a deck).

**Reason:** the Trust tier model makes confidentiality first-class — uploading `confidential/` materials to a cloud sandbox is the exact leak we designed against. Local execution keeps them on the machine; a standalone binary (not `npx`) removes the Node/pnpm install a non-programmer cannot do.
**Known dependency:** a non-programmer-friendly binary requires **code signing + notarization** (macOS Gatekeeper, Windows SmartScreen). Needs an Apple Developer account + a Windows Authenticode cert; until then, users hit OS security warnings.
**See also:** the app is **flags-only and agent-invoked** (no double-click / interactive launch in v1); both an interactive file-picker and an agent-fetch path that would sidestep this signing dependency are deferred — see `CONTEXT.md` → Deferred concepts.

---

## D15 — Primary delivery is a portable skills pack + standalone app (BYO LLM); the Cowork plugin is optional

**Decided:** the product ships as a **portable `skills/` folder of markdown playbooks + the standalone app**, driven by the user's **own** agentic LLM (Claude Cowork, Claude Code, Cursor, ChatGPT-with-tools, a local model). The app is invoked by the LLM if it has tools, or run by the human on the LLM's fill-plan if not. A **Cowork plugin is one optional packaging** of the same markdown.
**Revises:** D11's delivery clause ("delivered as a Cowork plugin with four skills"). D11's *core* — BYO LLM, **no LLM call in this codebase** — stands and is strengthened.
**Rejected:** Cowork-plugin-as-sole-delivery (D11's accepted "only usable inside Cowork" trade-off).

**Reason:** the skills are already plain markdown — the only Cowork-specific parts were `manifest.json` and plugin packaging. Decoupling removes the Cowork lock-in, matches the proven portable pattern in the firm's own `kDrive/99. Acme` (`AGENTS.md` + `SKILLS.md` + `skills/` that any LLM reads), and is *more* faithful to D11's principle that the LLM is the user's.

**Trade-off accepted:** outside Cowork there is no automatic skill-triggering or one-click install — the user tells their LLM to read the pack, and quality varies by LLM. The Fill-plan JSON remains the clean human/LLM ↔ app handoff, so the model **degrades gracefully** to a no-tools chat + a manual app run.
**See also:** the bundled app is **flags-only**, invoked by the LLM by relative path from inside the pack; an interactive (no-args) launch mode is deferred — see `CONTEXT.md` → Deferred concepts.

---

## D16 — An annotated Layout catalogue (with Usage tiers) drives pick & fill; the library scales to ~50–100

**Decided:** the closed library scales well beyond the v1 seed of ~6 to **~50–100** layouts (plus many block-types), each annotated in a machine-readable **Layout catalogue**: `tier` (Usage tier: `common`/`less-common`/`rare`), `usage` ("pick when…"), `regions` (a spatial map), and density `caps`. The LLM reads the catalogue to **pick** (tier + usage; *prefer common, justify rare*) and to **fill** coherently (the `regions` map gives spatial awareness). **Names stay role-semantic + lightly positional and stable.** Setup (D13) generates the catalogue; it is frozen in the Install.
**Rejected:** (a) a small fixed set of ~6 layouts (too few for real slide variety); (b) **encoding spatial/usage semantics in the `slot.*` / template names** themselves — names are a 3-way master ⇄ schema ⇄ JSON contract and would churn on every layout tweak.

**Reason:** the tool's value is (1) structure → (2) **pick** the right layout for the idea → (3) **fill** it precisely. With ~80 layouts a flat `layoutId` enum can't convey which to pick or how to fill; the catalogue carries that intelligence while names stay stable. Spatial `regions` give the LLM *awareness* for better content, never *control* — D8/D12 hold (it still picks and fills, never places). Scales the existing `CHART_CATALOGUE.md` precedent to the whole library.

**Note:** v1's walking skeleton still starts with ~6 layouts; D16 fixes the *pattern* (catalogue + tiers) so growth is just adding entries, not a redesign.

---

## D17 — Layouts carry an origin tier (Built-in / Company-approved / User) with within-company email transport

**Decided:** layouts (and minted blocks) carry an **origin** — **Built-in** (shipped), **Company-approved** (minted + reviewed, install-wide canonical), or **User** (minted on demand by one consultant). Minting reuses Setup's `shapes ≡ slots` gate, scoped to one layout. A User layout can be **promoted** to Company-approved after review. Sharing is **peer-to-peer email of a Layout package** (slide fragment + schema + catalogue entry + manifest); a **receive-time gate** asserts `shapes ≡ slots` + brand fit → install, else **quarantine** with a reason. **Within-company only** (same brand/master).
**Rejected:** (a) cross-company sharing in v1 (clashing brands — needs the deferred brand-theme split); (b) a lighter minting path that skips the `shapes ≡ slots` gate.

**Reason:** uses a proven three-tier origin model (**Built-in / Company-approved / User**) plus peer-to-peer transport (manifest → receive-gate → quarantine). Within-company scope keeps the brand identical, so a shared layout installs cleanly; the consistency guarantee holds because both minting and receiving run the `shapes ≡ slots` validator. This also gives the **skill creator** (D-skill) its tier vocabulary: Built-in vs Custom skills mirror Built-in vs User layouts.

---

## D18 — A skill creator generates Custom skills that compose (never expand) the closed library; self-contained email transport

**Decided:** a **skill creator** meta-skill (in the pack) generates **Custom skills** — new deliverable types beyond the four Built-in skills — that **compose only the frozen closed library** (layouts from the Layout catalogue, block-types, trust tiers, fill-plan schema). A Custom skill may set a new structure / tone / trigger / target master, but **never mints layouts, blocks, or brand**; a layout-gap **routes to Setup** (D13), the only minting path. Each Custom skill is **validated** (a sample fill-plan must pass Zod) and **human-gated**, then lives in the firm's **Install**. Sharing is a **self-contained Skill package** emailed within-company (bundles any User-layout dependencies; receive-gate vets + installs), mirroring D17.
**Rejected:** (a) a skill creator that can mint layouts (folds it into Setup, loses the cheap-playbook property and risks `shapes ≡ slots`); (b) declare-and-require transport (worse than self-contained for the "email a file, it works" bar).

**Reason:** a deliverable skill is just a markdown playbook that *composes* primitives, so generating one is cheap and safe **as long as it cannot expand the closed library** — that boundary preserves the consistency guarantee. Built-in skills and Custom skills mirror the Built-in and User layout tiers; layout-minting stays Setup / Company-approved. Reuses the D17 transport + receive-gate.

Every skill (Built-in and Custom) inherits a shared **Standard opener** — a *modifiable* default question block (language · client · context · objectives · timeline-if-appropriate) plus skill-specific follow-ups; the skill creator seeds it but the author may adapt it (a direction, not mandatory).

---

## D19 — Layout geometry is canonical from the master, not snapped to a design grid

**Decided:** a layout is defined by the master template's **named shapes at their actual positions** — the firm's real `.pptx` is canonical for **geometry** as well as brand (extends "the brand IS the template", D2-2). Layouts are **not** snapped to a 12×8 (or any) design grid; Setup (D13) learns them from the firm's real decks as-is. The LLM gets positional **awareness** from the catalogue's *descriptive* `regions` map (D16), not grid coordinates.
**Rejected:** a 12×8 design grid as the layout-authoring discipline (the earlier `SLIDE_LAYOUT_LIBRARY.md` framing).
**Retained:** the 12×8 grid as the concept for the **deferred flexgrid** (D12) only — a runtime placement system, not a v1 design constraint.

**Reason:** real consulting templates rarely align to a clean grid; snapping them would distort the firm's own design — exactly what "the brand IS the template" exists to prevent. **Trade-off accepted:** we give up the grid's cross-layout *alignment* guarantee — but alignment was the firm designer's job in the first place, and fidelity to their canonical template matters more. The `regions` map preserves the only thing the grid gave the LLM (positional awareness) without imposing geometry.

---

## D20 — v1 is fenced to the report-pptx walking skeleton; everything else is post-v1

**Decided:** v1 implements exactly **one** path end-to-end — `templates/report.master.pptx` + **all 26 layouts** (Phase 5 complete), filled mechanically (BYO LLM → fill-plan JSON → CLI → native `.pptx`). The other three skills ship as markdown playbooks, but only **report-pptx** is implemented and accepted in v1.
**Explicitly out of v1** (designed, deferred — do **not** build under the v1 brief): the **commercial-proposal** and **report** DOCX pipelines (M4); `waterfall` and any chart kind the approved libraries cannot natively produce (see D21); **Setup / Ingestion** (D13) and firm-context confidentiality handling; layout **sharing** (D17); the **skill creator** (D18); and **signed-binary packaging / distribution** (D14).
**Rejected:** the broad "four implemented skills + Setup + sharing + binary" v1 brief — the scope sprawl flagged by the 2026-06-05 repo reviews.

**Reason:** a single working report-pptx slice proves the entire thesis (LLM drafts → template anchors → Office edits) with the least surface area, gates the riskiest work (PPTX + charts) first, and stops an autonomous agent wandering into Setup/D17–D18/packaging. It realises the **walking-skeleton-first** intent already stated in OVERVIEW §12 and the open questions below. **Scope, not architecture:** D11/D15 (BYO LLM), D2/D3 (libraries), and D14 (eventual signed binary) all still stand — D20 only bounds what is *implemented and accepted* in v1. Phase 5 extended the walking skeleton from one layout to the full 26-layout library without changing this fence.

---

## D21 — v1 charts are `pptx-automizer` data-swaps into pre-authored master charts; dynamic build and DOCX charts deferred

**Decided:** in v1 every chart is produced by **`pptx-automizer` swapping the dataset into a chart that already exists in the master `.pptx`** (same-type data swap). The set of supported chart kinds is therefore **whatever we pre-author into the master template** — we will create the matching template charts for the kinds we want. The fill-plan supplies **data only**, never chart geometry or a from-scratch chart type. (Because PowerPoint natively supports waterfall, treemap, etc., a pre-authored chart of those kinds is swappable too — the v1 set is bounded by the master, not by a library's build API.)

**Corollary — v1 chart-type selection is master-fixed per slot:** each chart-bearing slot in a layout is pre-authored as **one** chart type, and the layout schema **pins that slot's `kind` to a literal** (e.g. `kpi-row-chart`'s `slot.chart` = `stacked-bar`); Zod rejects a fill-plan whose chart `kind` mismatches. The LLM **picks a layout and supplies data — it does not choose chart type or geometry** (consistent with D8). Multi-kind slots (master holds one pre-authored chart per kind; pipeline selects the match) arrive **with** the deferred PptxGenJS route, not in v1. Schema impact: the chart-slot `kind` becomes a per-layout literal rather than a free fill-plan field, and the `kpi-row-chart` sample's `kind` is slot-determined.

**Deferred (post-v1, logged so they are not re-invented):**
- **PptxGenJS injection** — constructing charts from scratch (incl. variable-type, or kinds not pre-authored in the master) and injecting via `pptx-automizer`. This is the route for dynamic chart types; not in v1.
- **DOCX charts** — DOCX is out of v1 (D20); the chosen `docx`/dolanmiu lib has **no** native chart classes. When DOCX returns, two logged options: **(a) the PPT route** — generate the chart in the `.pptx` and have the user **copy-paste** it into a placeholder in the Word document; **(b) the paid docxtemplater chart module** — integrate docxtemplater's (paid) basic Word charts. Option (b) partially reopens **D3** (which rejected docxtemplater partly *because* its chart module is paid) — acceptable to revisit for DOCX, since dolanmiu/docx offers no charts at all.

**Rejected (for v1):** promising chart kinds the pipeline can't yet produce. Earlier docs claimed `pptx.charts.WATERFALL` in PptxGenJS — **false** (PptxGenJS 4.0.1's `CHART_NAME` has no waterfall). Under the swap-only route, waterfall is supportable **only if pre-authored in the master** and only if `pptx-automizer` can update PowerPoint's extended-chart (`chartEx`) data — **verify during M3**; classic types (bar/stacked-bar/line/area/pie/doughnut/scatter) are known-good for data swap.

**Reason:** the same-type-swap route promises exactly what the master can hold, preserves the styling authored there, and removes the dependency on a chart-build library's limited native types — the lowest-risk way to ship brand-correct charts in the v1 walking skeleton. Dynamic construction and DOCX charts carry real unknowns (extended-chart support, a paid module, a manual copy-paste UX) and are correctly pushed past v1.

---

## D22 — Adopt the firm's real sanitized template; build the 26-layout library + Layout catalogue via one-time manual Setup

**Decided:** adopt the firm's **real sanitized** `report.master.pptx` (26 slides → 26 layouts) as the canonical master via a **one-time manual Setup** (Phase 1: analysis + docs; Phase 2: human review of the AI-proposed naming table; Phase 3+: mechanical OOXML rename, Zod schemas, catalogue, pipeline). **Deliberate layout variations are preserved, not merged** — Cover / Cover-white, Section / Section-white, Agenda / Agenda-white, Contrast 1–4, High contrast 1–4 remain distinct `layoutId`s. **Usage tier** is seeded from the deck's two PowerPoint sections (slides 1–16 = `common`, 17–26 = `less-common`); thereafter the **Layout catalogue owns tier** (D16). **Charts** stay D21 data-swaps into four pre-authored masters: `stacked-column`, `clustered-column`, `line`, `bubble`. Introduce new region kinds from the master placeholders: **`subtitle`** (short `text` / `callout` under titles or above columns; "Click to edit subtitle"), **`chart-title`** (chart name + unit line above chart; distinct from slide subtitle), and **`source`** (footer citation strip; LLM-filled, hyperlinks when available). Footer band disambiguated: **`slot.footer-logo`** (auto) · **`slot.source`** (LLM) · **`slot.footer-page`** (auto). **Naming workflow:** AI proposes `docs/setup/naming-table.md` → human reviews → mechanical OOXML write of `slot.*` names → `shapes ≡ slots` validator. **Phase 5 complete:** the walking-skeleton `kpi-row-chart` layout and `PLACEHOLDER-report.master.pptx` are retired; all 26 real layouts fill via `templates/report.master.pptx` and `skills/report-pptx/layout-catalogue.json`. **Layout catalogue** is built (machine-readable, LLM-facing); density **caps live in both Zod (enforce) and the catalogue (LLM-facing)**, kept in sync by a **drift test** — not single-source codegen.

**Rejected:** building the general Setup skill (D13) in this epic — deferred until after the naming table is human-approved; **curating/merging** the 26 deliberate variations into fewer layouts; **single-source schema+catalogue generation** (caps duplicated with a drift test instead).

**Reason:** the sanitized firm template is the real brand + geometry source (D2-2, D19). A one-time manual Setup path ships the full ~26-layout library without waiting on the general Setup skill, while preserving the human gate that prevents silent master/schema mismatch (D13). Preserving deliberate variants honours the firm's own layout taxonomy. Dual caps + drift test keeps Zod enforcement and LLM-facing catalogue intelligence without fragile codegen coupling.

---

## D23 — Density caps are two-tier: an optimal range (CLI-warned) + an absolute max (Zod-rejected)

**Decided:** each text region carries **two** bounds in `src/schema/caps.ts` (the single source, mirrored by the LLM-facing catalogue per D22's drift test): an **optimal** range and an **absolute max**. Zod enforces only the **max** (reject); the CLI emits a **soft warning** (exit 0, stderr) when content is over optimal but within max. This **supersedes** the original single-cap-per-region model — the caps previously listed in `SLIDE_LAYOUT_LIBRARY.md` / `CHART_CATALOGUE.md` were the *optimal* tier. **Enforced max:** title 20 · section-title 12 · subtitle 40 · chart-title 25 · source 80 · cover-body 40 · content-text 100 · content-callout 40 words; content-bullets ≤8 items / ≤100 words; caption 200 chars. **Optimal:** title 8–15 · section-title ≤8 · subtitle ≤25 · chart-title ≤15 · source ≤40 · cover-body ≤25 · content-text ≤60 · callout ≤25 words; bullets ≤5 items / ≤60 words; caption ≤120 chars. Structural hard limits unchanged: general `bullets` block ≤7 items; pie/doughnut rows ≤8.

**Rejected:** a single cap per region (too blunt — it either rejects acceptable-but-dense slides or permits layout-breaking overflow); **auto-truncating** over-max content (reject with a clear error, never silently "fix" — `ERROR_HANDLING.md`).

**Reason:** consultants legitimately run a little long; a single hard cap forced a false choice between rejecting usable content and permitting overflow that breaks the master geometry (D19). Two tiers let the author aim for optimal while the schema still guarantees the master never visually breaks. Caps stay dual-homed (Zod + catalogue) per D22's drift test; the CLI surfaces the optimal-tier guidance as a non-blocking warning.

---

## D24 — Superset worktree setup runs pinned pnpm through Corepack

**Decided:** commit `.superset/config.json` (`{ "setup": ["./.superset/setup.sh"] }`) and `.superset/setup.sh`, so every new Superset worktree auto-runs `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm install --frozen-lockfile` on creation. Superset only copies git-tracked files, and `node_modules` is gitignored, so each fresh worktree otherwise starts without dependencies and cannot run the gate (`pnpm run build && lint && test && validate`). Invoking pnpm through Corepack honours the exact `packageManager` pin (`pnpm@11.5.2`) without requiring a globally installed `pnpm` shim. Corepack is the prerequisite, supplied by the Node version in `.nvmrc` or installed separately. No teardown script: there are no external resources (DB branches, containers) to clean up, and deleting the worktree removes `node_modules`.
**Rejected:** assuming an arbitrary global `pnpm` binary (does not enforce the repository pin and fails on otherwise valid Corepack-only machines); `corepack enable` in the setup hook (mutates global shims and can require permissions, while `corepack pnpm` works directly); a plain install without `--frozen-lockfile` (would silently mutate `pnpm-lock.yaml` — undesirable in the parallel-agent model).

**Reason:** the multi-agent workflow (AGENTS.md §0) runs each agent in its own long-lived worktree folder with ephemeral per-task branches; a committed setup script makes every worktree gate-ready immediately and identically across agents (Claude, Cursor, Codex). Corepack makes the `packageManager` field authoritative, and `--frozen-lockfile` fails fast on a stale lockfile rather than mutating it. The script is idempotent (safe to re-run). Because `.superset/config.json` is committed and affects all agents, it is recorded here per AGENTS.md §0 rule 5.

---

## D25 — Anthropic's `pptx` skill is a reference and a benchmark, never a component or a code source

**Decided:** treat Anthropic's official `pptx` skill ([anthropics/skills → `skills/pptx`](https://github.com/anthropics/skills/tree/main/skills/pptx)) as **external reference material and a recurring benchmark — never a dependency, an engine, or a source of code**. Three concrete practices:

1. **CI output-format regression guard (Phase 5+, `tasks/T-106`).** The pipeline strictly validates its *input* (fill-plan vs Zod, D23 caps) but trusts its *output* — nothing checks that the emitted `.pptx` is structurally sound. T-106 adds a **CI-only regression guard** that re-loads fixture-driven outputs (internal-relationship resolution, content types, `pptx-automizer` re-load). A **runtime** post-save gate on real deliverables is deliberately out of scope — it would require revisiting D7 (no Office parsing at runtime), a new `ERROR_HANDLING.md` failure class, and validate-before-rename atomicity; that is its own future decision. The skill's `scripts/office/` validation stack (ISO/IEC 29500 XSDs, relationship/content-type/slide-layout checks) is the design reference — **read for ideas, never copy** (licence below).
2. **`pptxgenjs.md` as a pitfalls reference for the deferred D21 dynamic-chart route.** The skill's [`pptxgenjs.md`](https://github.com/anthropics/skills/blob/main/skills/pptx/pptxgenjs.md) documents hard-won silent-corruption gotchas (`#`-prefixed hex colours, 8-char hex opacity, option-object reuse across calls, unicode bullets, …). When the deferred PptxGenJS injection route (D21) is built, consult it — learn from it, do not copy text or code into this repo.
3. **Occasional benchmark runs.** Periodically hand the same brief + master to plain Claude with the pptx skill (authorized use, inside Claude products) and compare brand fidelity, chart correctness, repeatability, and token cost against this pipeline. Today the skill loses on charts-in-templates (its template-editing workflow has no chart story) and on repeatability (per-run LLM judgment + visual fix-and-verify QA). If that gap ever narrows, record it here and revisit scope.

**Rejected:** **adopting the skill as the fill engine.** Its two routes are precisely what this architecture rejects: (a) LLM hand-editing of slide XML with visual fix-and-verify QA — per-run judgment calls on layout choice, overflow, and shape deletion (vs D8 no-free-placement, D12 fixed templates, and the reject-don't-fix policy in `ERROR_HANDLING.md`); (b) free-coordinate PptxGenJS code generation, brand-by-instruction (vs D8, D19). It also requires Claude with code execution per deliverable (vs D11/D15 BYO LLM); and where this codebase enforces content, density, and brand as deterministic, machine-checkable contracts (Zod caps, D23), the skill's QA of those same concerns is LLM/inspection-driven — content-extraction checks and thumbnail review with a mandatory fix-and-verify loop — its only *deterministic* validation being output file format (XSD/relationship checks). **Also rejected: vendoring or porting its scripts/schemas.** The skill's `LICENSE.txt` is proprietary — "All rights reserved", with explicit restrictions on extraction, copies, derivative works, and distribution. Nothing from that repo may enter this codebase. (The ECMA-376 XSDs themselves are freely published by ECMA and remain usable by an independent T-106 implementation.)

**Reason:** the skill answers "can Claude produce a deck?" with per-run judgment and inspection-based QA; this product guarantees brand-true, schema-valid output *by construction* (D8, D12, D21, D22). The two validate complementary layers — the skill gates the output file format ("will PowerPoint open it?"), this codebase gates the input contract ("is the fill-plan valid against the closed library?") — which is exactly why its format-level checks are worth mirroring independently (T-106) while its generation model stays rejected. Recording this here prevents re-litigating "why not just use the official skill?" and keeps the licence boundary explicit for every agent working this repo.

---

## D26 — Comfortable-fill bands: per-(layout, region) fill targets derived from master geometry, with a two-sided soft-warning

**Decided:** add a third density signal beneath D23's two-tier caps — a **comfortable-fill band**, a two-sided target (`lower..upper`) computed **per (layout, region)** from the box's real geometry (`src/setup/layout-spec.json` `x/y/w/h`, D19) and its effective font size. **`layout-spec.json` geometry is in inches**; Setup converts to points before dividing by font pt. Derivation uses an **analytic line model**: `lines = ⌊(h_in × 72) / (pt × 1.2)⌋`, `charsPerLine = ⌊(w_in × 72) / (pt × 0.5)⌋`; **unit conversions:** prose capacity in words ≈ `(lines × charsPerLine) / 6`; bullet capacity in comfortable items ≈ `lines / 1.3`; **band = `[~0.55, ~0.85] × capacity`**. The two constants (`~0.5` char-width, `[0.55, 0.85]` fill fraction) are **calibrated once** against 2–3 real **body** boxes with a recorded golden (`fixtures/golden/comfortable-fill-calibration.json`). **Eligible region kinds** — **multi-line body/content regions only:** `content-text`, `content-bullets`, `content-callout` (plus any body region holding multi-line prose/bullets). **Excluded:** all heading/label kinds — `title`, `section-title`, `subtitle`, `chart-title`, `source`, `cover-body` — and non-text kinds (`chart`, `image`, `footer`). **Rationale:** headings are intentionally sparse-in-large-boxes (correct design, not under-fill); the analytic model assumes dense prose and over-estimates capacity for heading strips, so the band targets only body regions where under-fill actually occurs. **Geometry resolution:** some slots carry inherited-placeholder geometry (`geometry: null` in `layout-spec.json`). Setup **resolves** inherited geometry from the slide-layout/master placeholder during generation; if unresolvable, **omit** the band for that slot (no band entry — never a degenerate `[0,0]`; never divide absent `w/h`). **Font size is sourced hybrid:** the run's explicit `sz` when present, else the placeholder → layout → master style cascade, else a **pinned per-kind default pt table** for eligible body kinds only, derived from the master's `bodyStyle` (e.g. `content-*` → 12 pt, or 18 pt where the master uses it). **Invariant:** the derived band is **clamped within its region kind's D23 `[optimal … max]`** — the band can **never** advertise a target the Zod `max` would reject. Bands are **generated single-source**: Setup derives them; `skills/report-pptx/layout-catalogue.json` is the emitted LLM-facing artifact; `src/schema/caps.ts` holds only the `ComfortableFillBand` **type**; a **regeneration/drift test** keeps catalogue == deriver output honest (not dual-homed like D23's hand-set caps). Unlike D23's `optimal`/`max` (keyed by region *kind*, and therefore footprint-blind), the band is keyed by the **box** — so a full-width body and a half-width column get different targets. The CLI emits **two-sided soft-warnings** (exit 0, stderr) when content falls **below `band.lower` or above `band.upper`** — distinct from D23's per-kind hard `max` (Zod reject, exit 2). **Precedence / dedup:** where a region has a D26 per-box band, that band **supersedes** D23's footprint-blind `optimal` warning — **at most one density warning per region**. The runtime source T-202 reads is the **catalogue** (the derived spec emitted by Setup). The `report-pptx` skill instructs the LLM to **match content volume to a layout's fill-band** when selecting a layout — which is how "how much text / what size?" is answered **without** ever letting the LLM choose a font (the master stays canonical — D2-2; SKILL.md §1 hard rule intact).

**Rejected:** recalibrating D23's per-kind `optimal` alone (stays footprint-blind — same target for full- and half-width boxes); **LLM-facing prose hints only** (nothing checks them); a **runtime font-size choice** in the skill (violates "the LLM never chooses fonts" — D2-2 / §1); **density-variant layouts now** (deferred — add only if real decks still read sparse after the band ships); and **dynamic box resize to content** — that is the deferred **flexgrid** (D12) and stays out of v1.

**Reason:** the under-fill consultants observe (content rattling around in oversized boxes) is structural — D23 caps are an upper bound keyed by region *kind*, so they neither target a fill level nor distinguish a full-slide body from a narrow sidebar; identical content draws the identical cap in both. The geometry that fixes this already exists in `layout-spec.json` (D19), and the master uses only ~4 role-correlated font sizes, so a deterministic analytic band is cheap, testable, and accurate enough — the gap to the hard `max` is wide, so a rough band suffices. Turning "what font size?" into "which layout best fits this much content?" keeps the entire fix inside the fixed-geometry, fill-only model (D8) while giving both the LLM and the human a checkable signal in **both** directions.

---

## D27 — Structured consulting-archetype enrichment via a topology split (tables grow; box-diagrams are fixed-cardinality)

**Decided:** grow the closed layout library (D16/D22) with the classic-consulting **structured-diagram family** — the "rectangles" — modelled by the **topology** of each archetype so nothing violates fixed geometry (D8/D19):

- **Row/table archetypes** — **RAG / stoplight status table**, **comparison table**, **generic data table** — fill through a **new `table` region-kind** whose **rows grow inside a master-fixed frame**. This is the D21 chart **data-swap** philosophy applied to tables (via `pptx-automizer` table modification): the frame's geometry is authoritative, only row data varies, and no *other* shape moves.
- **Box-diagram archetypes** — **2×2 matrix** (+ optional 9-box), **process / value-chain**, **KPI cards strip**, **big-number / executive takeaway**, **pyramid**, **funnel**, **roadmap / timeline**, **feature / icon grid**, **quote / pull-callout** — are **fixed-cardinality layout variants** with **sub-slotted cells** (`slot.<region>.<cell>.<sub>`, per the SLIDE_LAYOUT_LIBRARY naming convention); each cell carries its own **D26 fill-band**.

**Cardinality policy:** author **3 / 4 / 5** per linear archetype (process, KPI, funnel, feature-grid, roadmap); **3 / 4** for pyramid; **fixed-4** for the matrix (+ optional 9-box); **singular** for big-number and quote; **growing** for the three tables — **23–24 new layouts** (23 + 1 optional). **Exact `layoutId`s:** `process-3`, `process-4`, `process-5`; `kpi-3`, `kpi-4`, `kpi-5`; `funnel-3`, `funnel-4`, `funnel-5`; `feature-grid-3`, `feature-grid-4`, `feature-grid-5`; `roadmap-3`, `roadmap-4`, `roadmap-5` (= 15 linear); `pyramid-3`, `pyramid-4` (= 2); `matrix-2x2` (+ optional `matrix-9box`, = 1–2); `big-number` (= 1); `quote` (= 1); `table-rag`, `table-comparison`, `table-generic` (= 3). **Table contract:** each table layout's Zod schema **pins column count, order, and identity**; the fill-plan `table` block supplies **row values only** (no `columns` key). **Authoring boundary (D8/D13/§5 unchanged):** authoring new layout geometry/styling is a **Setup-time, human-owned** (or human-gated) design activity in the D22 Setup lineage — **distinct** from the runtime fill path, where the BYO LLM **never** chooses coordinates, sizes, fonts, or colours. The draft-to-theme + brand sign-off gate governs **who designs the slides** (a human/designer, optionally AI-assisted) and confirms brand fidelity; it **never** lets the runtime LLM place geometry. **Authoring & brand fidelity:** new layout slides are **drafted to the master's existing theme** (its accent palette, the 8/12/18/22 type scale, its rectangle/accent styles — never invented styling), then pass a **brand sign-off gate** before the `layoutId` enters the catalogue (lightweight for the public *Acme* placeholder master — `docs/setup/phase6-brand-signoff.md` + a visual-diff checklist against the existing 26; a firm designer's nod on a real install). Each archetype then follows the standard add-a-layout path (SLIDE_LAYOUT_LIBRARY "Adding a new layout": design → name shapes → regenerate `layout-spec.json` via Setup → **Setup-authored** Zod schema (hand-written under human review, like the existing 26 — D22 Phase 3) + catalogue entry + fixture; schemas are **frozen contracts** against feature-work edits — §5; T-212/T-213 consume, never hand-edit).

**Deferred to v1.1 (logged, not scheduled):**

- **Setup-phase archetype suggestion** — on import (D13 Setup), the LLM scans the firm's existing decks, detects which archetypes their template *lacks*, and proposes draft slides through the **same** brand sign-off gate. (The enrichment decided here is the manual, in-repo version of that loop.)
- **Slot-name dry-run** — a Setup verification pass that fills **every shape with its own `slot.<name>` literal**, producing a deck the consultant/designer signs off to confirm the shape↔slot schema imported correctly.

**Rejected:** **max-N + hide unused cells** (without reflow, a 3-step process in a 5-box frame leaves holes — and reflow *is* the deferred flexgrid, D12); **firm-designer-only authoring** (blocks an LLM-driven tool on human design availability); **one canonical count per archetype** (forces the LLM to pad/condense to a fixed count — reintroducing the under/over-fill D26 removes); **org/stakeholder maps and Gantt** (connector-/dependency-heavy — revisit later); **new chart kinds such as waterfall** (that is the deferred dynamic chart build, D21).

**Reason:** steering and delivery decks are built from matrices, process flows, KPI strips, RAG tables, and hero numbers — none of which the firm's original 26 layouts cover, so consultants hit a wall the moment they need structure rather than prose. Splitting by topology lets each archetype stay inside the fixed-geometry guarantee: tables grow the one way that doesn't move neighbours (inside their own frame, like a swapped chart), while box-diagrams use exact-count variants so every cell lands in its D26 band. Authoring to the master's own theme behind a sign-off gate preserves the "always brand-correct" promise even though these layouts are *new* rather than *adopted* (D22). The two v1.1 items extend the same author-draft-then-sign-off discipline to the import path itself.

---

## Open questions still to resolve

- **Doc-heavy vs deck-heavy volume mix** — RESOLVED: deck-heavy. The first end-to-end slice is **report-pptx** (the delivery deck), built as a walking skeleton before the other three skills.
- **First-template scope** — RESOLVED: design **`report.master.pptx`** first — it gates the report-pptx slice. The other three masters follow once the skeleton proves the pipeline.
- **Real master template for report-pptx** — RESOLVED (D22): the firm's sanitized template is in-repo at `templates/report.master.pptx` (26 layouts). AI-proposed naming table at `docs/setup/naming-table.md` awaits human review before mechanical naming.
- **Volume of generations per consultant per day.** Still open. If high, Cowork session quota becomes a real constraint and v3's standalone-API path moves up the roadmap.
