# Build Brief — Document System

**For:** the implementing developer / Claude Code
**Companion to:** `DOCUMENT_SYSTEM_ARCHITECTURE.md` (the architecture memo)
**Date:** 2026-05-21

---

## How to use this brief

The architecture memo explains **why**. This brief is **what to do**: repository
layout, build milestones, and acceptance criteria. Read the memo first, then
build to this brief. If the two ever appear to conflict, the memo's §2 principle
and §3 requirements win — stop and ask rather than guessing.

Work milestone by milestone. Do not start a milestone until the previous one's
acceptance criteria all pass.

---

## 0. Guardrails (non-negotiable)

- **Greenfield.** Start from an empty repository. Import no code, schema, or
  config from any prior prototype (memo R14).
- **Open-source only** for the build/runtime stack — use only the components
  listed in memo §5. Do **not** add any other runtime dependency without
  explicit written approval. The LLM is the sole non-OSS component (memo §9).
- **Do not use** Tiptap Pro, Tiptap Cloud, or any paid SaaS.
- **DocModel is canonical** (memo §2). The editor, Yjs, and YAML are
  projections of it. Never make editor state or a CRDT document the source of
  truth.
- **Do not build** anything in memo §10: no think-cell clone, no free-canvas
  deck editor, no DOCX/PPTX import or parsing, no PPTX export, no real-time
  collaboration in v1, no live-models platform.
- **Demo DOCX/PPTX are a setup-time reference only** (memo R15). Never write
  code that parses or generates Office files.
- **When uncertain, stop and ask.** Do not invent brand values, client
  content, or block types. Use `TBD` placeholders and flag them.

---

## 1. Repository layout

```
docsystem/
  package.json
  tsconfig.json
  vite.config.ts
  README.md
  /src
    /schema          # Zod schema = the company template as code (memo L1)
      docmodel.ts    #   DocModel type + top-level schema
      blocks.ts      #   one schema per block type (the closed block library)
      brand.ts       #   brand-token schema
    /docmodel        # DocModel operations
      load.ts        #   load + validate
      serialize.ts   #   DocModel <-> YAML projection (lossless)
      patch.ts       #   scoped block-patch operations
    /renderer        # DocModel -> HTML (memo L5)
      /blocks        #   one React component per pre-built block type
      DocumentRenderer.tsx
      DeckRenderer.tsx        # v1.1
    /editor          # WYSIWYG (memo L3, §6)
      /nodes         #   one custom TipTap node per pre-built block type
      Editor.tsx
      mapping.ts     #   DocModel <-> editor-document mapping
    /comments        # comment mark + comment-to-AI workflow (memo §7)
    /llm             # LLM interface: outline generation, scoped patches (L2)
    /export          # Playwright PDF export + .docsys bundle export
    /brand           # brand-token file (authored at setup from demo files)
    /block-primitives # scaffold components that generated blocks must use
  /generated-blocks  # consultancy-specific blocks created by setup AI
    /pending         #   awaiting human review — app refuses to load these
    /active          #   approved blocks — app loads these at runtime
  /setup             # setup-time tooling
    scan-demos.ts    #   ingest DOCX/PPTX/PDF -> brand draft + catalogue diff
    regenerate.ts    #   re-run generation against current scaffold; diff -> /pending
    lint-generated.ts #  whitelist + forbidden-pattern enforcement
  /templates         # slide-layout library (v1.1)
  /scripts           # validate.mjs, export-pdf.mjs, setup-install.mjs
  /fixtures          # sample DocModel YAML; valid + invalid validation fixtures
  /tests
```

---

## 2. Stack & setup

- **Runtime:** Node + npm, Vite + React + TypeScript.
- **Dependencies (exact set — memo §5):** `react`, `react-dom`, `vite`,
  `typescript`, `zod`, `yaml`, `echarts`, `mermaid`, `@tiptap/react`,
  `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `playwright`.
- **Dev-only:** `vitest` (tests), `@types/*`, ESLint + Prettier.
- **npm scripts:** `dev`, `build` (`tsc --noEmit && vite build`), `validate`
  (schema-check fixtures), `export:pdf`, `test`.
- Block reordering uses TipTap's built-in node drag/drop. If a separate
  drag-and-drop library is wanted, flag it for approval first — it is not in §5.

---

## 3. Milestones

### M0 — Project scaffold
- [ ] Empty repo → Vite + React + TypeScript app, the §1 folder layout, ESLint/Prettier, vitest.
- [ ] All npm scripts defined; `dev` and `build` run clean.
- **Acceptance:** `npm run build` passes with `tsc --noEmit`; the empty app renders; CI/lint is green.

### M1 — Schema & DocModel + Block catalogue + Setup AI pipeline
- [ ] Zod schema for the DocModel: metadata, brand reference, ordered sections, ordered typed blocks.
- [ ] **Pre-built 15-block generic catalogue** — implement each block per `blocks.catalogue.yaml`. One Zod schema + one React renderer + one TipTap node view per block.
- [ ] **Every block has a stable `id`.**
- [ ] Brand-token schema (per `brand.example.yaml`); one authoritative brand file per consultancy.
- [ ] `validate()` rejects invalid documents with clear, located errors.
- [ ] YAML projection: `DocModel -> YAML` and `YAML -> DocModel`.
- [ ] **Setup AI block-generation pipeline:**
  - [ ] CLI command `setup:scan-demos` that ingests DOCX/PPTX/PDF demos and produces a draft brand-token file + a catalogue diff (existing-block uses + new-block proposals).
  - [ ] Generated blocks land in `/generated-blocks/pending/` with the metadata header (`Generated by`, `Source patterns`, `Reviewed by`, `Last regen`).
  - [ ] App **refuses to load** any block still in `/pending/`. Human reviewer manually moves approved files into `/generated-blocks/active/`.
  - [ ] **Constrained code generation**: generated React/TipTap code uses a pre-defined scaffold; AI only fills the `attrs` schema and a restricted JSX render slot.
  - [ ] **Whitelist enforcement**: a lint rule fails the build if generated code imports outside the whitelist (`react`, `@tiptap/*`, `echarts/*`, `./brand-tokens`, `./block-primitives`).
  - [ ] **Forbidden patterns**: build fails on `dangerouslySetInnerHTML`, `eval`, `Function`, `fetch`, `XMLHttpRequest`, or any direct CSS injection.
  - [ ] **CSP-sandboxed rendering**: generated blocks render inside a Content-Security-Policy-constrained iframe in the editor; pre-rendered to static HTML at PDF export time.
  - [ ] **Hard cap**: setup escalates to developer review if more than 10 new blocks are proposed.
  - [ ] **Auto-generated tests**: each generated block ships with one valid fixture, one invalid fixture, and a snapshot test of rendered HTML.
  - [ ] **Regen pipeline**: a `setup:regenerate` command re-runs generation against the current scaffold version, diffs the output, and routes any drift to `/pending/` for human re-review.
- **Acceptance:**
  - a fixture DocModel using each of the 15 pre-built blocks validates.
  - the invalid fixtures all fail with readable errors.
  - **YAML round-trip is byte-stable and lossless** (automated test).
  - no block type exists outside the closed library (15 pre-built + active generated).
  - `setup:scan-demos` produces a draft catalogue + brand file from a sample DOCX/PPTX fixture; output is in `/pending/` and the app refuses to load until a human moves it to `/active/`.
  - a deliberately-malicious generated block (containing `dangerouslySetInnerHTML` or a `fetch` call) is rejected by the lint rule and does not build.

### M2 — Renderer + HTML/PDF
- [ ] One React component per block type under `/renderer/blocks`.
- [ ] `DocumentRenderer` composes blocks into an HTML document; brand tokens applied from the brand file.
- [ ] Playwright PDF export; running headers/footers and page numbers via `page.pdf()` `headerTemplate`/`footerTemplate`; page-break CSS (`break-inside: avoid`).
- **Acceptance:** a fixture DocModel renders to HTML and to PDF; **HTML and PDF are produced by the same Chromium render and match visually**; the renderer runs with **no editor present**; brand is consistent across two different fixture documents.

### M3 — LLM interface
- [ ] Outline-driven generation: structured outline in → schema-valid DocModel out.
- [ ] Generated output is **validated against the schema before acceptance**; invalid output is rejected, never silently used.
- [ ] Scoped block patch: a `BlockPatch` changes exactly one block by `id`.
- [ ] **Model stratification** (per D-11): default to a cheap/fast model for comment-to-AI; route to a frontier "thinking" model only when the consultant toggles it in the comment popup. Model + API key per provider configured at install time.
- [ ] **Batched call with caching** (per D-13): one API call per batch returns N structured patches. Prompt-cache the schema + brand + doc-state context. Per-patch validation after response; retry failed patches one-at-a-time with corrective re-prompt. Full-call failure retries the batch once, then falls back to per-comment.
- [ ] **Threaded comments** (per D-12): each comment carries a `thread[]` of typed entries (`instruction`, `ai-proposal`, `follow-up`). Follow-ups queue locally and ship in the next batch with full thread context.
- [ ] **Operational cost ledger** (per D-34): local SQLite (`cost.db` at the app config path) recording, per API call: timestamp, model, input/output tokens, computed cost, doc ID. **No prompt/response content. No behavioral signal.** 13-month sliding-window retention. Used to enforce the monthly per-consultant limits from D-14 (80% warning, 100% hard stop, admin override).
- [ ] **Cost ledger user controls:** `Settings → My LLM Spend` view; "Clear all cost history" wipe button (warns about quota reset); toggle to disable cost-tracking entirely (also disables monthly limits).
- [ ] **Install-time privacy disclosure** covering what cost data is stored, where, why, and how to view/wipe it.
- **Acceptance:**
  - given a sample outline, the LLM produces a valid DocModel
  - a scoped patch modifies only its target block and leaves all others byte-identical
  - malformed LLM output is rejected with a clear error
  - a 20-comment batch produces 20 validated patches in a single API call (with caching) and per-patch retry recovers any individual failures
  - a follow-up on a comment includes the prior `ai-proposal` in the next batch's context
  - cost ledger records cost rows on every call, never records prompt/response content (verified by automated test), enforces the monthly limit, and "Clear history" wipes the SQLite cleanly

### M4 — WYSIWYG editor
- [ ] TipTap (open-source core) on ProseMirror; one custom node per block type.
- [ ] Structural blocks → atom nodes with a schema-validated `attrs` payload edited via a React node view; prose → native rich text.
- [ ] `mapping.ts`: `DocModel <-> editor document`, with **losslessness tests both ways**.
- [ ] Block-library palette (closed set); reorder/add/remove; grid-anchored placement; **no free canvas**.
- **Acceptance:** load a DocModel, edit it, save it back → round-trip is lossless (automated test); a consultant can add/remove/reorder blocks; the editor **cannot** produce off-schema content; consultants never see YAML/JSON (R4).

### M5 — Comment-to-AI
- [ ] Custom inline comment **mark** with an ID; comment records in a top-level `comments[]` array on the DocModel (shape per memo §7).
- [ ] Single-comment and **batch** ("process all") workflows.
- [ ] AI returns a patch scoped to the comment's block; shown as an **accept/reject proposal**; **never auto-applied**.
- **Acceptance:** highlight → comment → AI proposal → accept/reject works; comments survive save/reload **and** YAML round-trip; batch mode works; the AI never edits outside the comment's block (automated test).

### M6 — Deck renderer (v1.1)
- [ ] `DeckRenderer` over the **same** DocModel; a fixed, closed library of slide layouts.
- **Acceptance:** the same DocModel renders as a deck; layouts are a closed set; no free positioning; deck reuses the schema, editor, and comment system unchanged.

---

## 4. Per-component "done means"

| Component | Done when |
|-----------|-----------|
| Schema | Every block type validated; closed library enforced; clear errors |
| DocModel + YAML | Lossless round-trip proven by test; renders without the editor |
| Renderer | One component per block; HTML+PDF from one render; brand consistent |
| LLM interface | Output schema-gated; patches provably scoped to one block |
| Editor | DocModel⇄editor mapping lossless (tested); off-schema content impossible |
| Comment-to-AI | Proposals never auto-apply; comments survive serialization; batch works |
| Deck renderer | Closed layout set; reuses all shared layers unchanged |

---

## 5. Testing requirements

- **Mandatory automated tests:** schema validation (valid + invalid fixtures);
  YAML round-trip losslessness; DocModel⇄editor mapping losslessness; LLM-patch
  scoping (only the target block changes).
- Render smoke tests: each block type renders to HTML and to PDF without error.
- Keep `/fixtures` with at least two complete sample DocModels and a set of
  deliberately-invalid documents.

---

## 6. Definition of done — v1

- M0–M5 acceptance criteria all pass.
- The **flowing-document path works end to end**: structured outline → LLM
  generation → editor → comment-to-AI → HTML + PDF output.
- The build/runtime stack is verified open source (memo §5); the LLM is the
  only external dependency.
- The system runs locally; a DocModel renders to PDF/HTML with the editor
  switched off.
- No item from memo §10 has been built.

v1.1 (decks) and v2 (collaboration, interactive HTML / live models) follow
only after v1 is shipped and in consultants' hands.
