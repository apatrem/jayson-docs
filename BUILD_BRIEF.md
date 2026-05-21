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
      /blocks        #   one React component per block type
      DocumentRenderer.tsx
      DeckRenderer.tsx        # v1.1
    /editor          # WYSIWYG (memo L3, §6)
      /nodes         #   one custom TipTap node per block type
      Editor.tsx
      mapping.ts     #   DocModel <-> editor-document mapping
    /comments        # comment mark + comment-to-AI workflow (memo §7)
    /llm             # LLM interface: outline generation, scoped patches (L2)
    /export          # Playwright PDF export
    /brand           # brand-token file (authored at setup from demo files)
  /templates         # block/layout catalogue; slide layouts (v1.1)
  /scripts           # validate.mjs, export-pdf.mjs
  /fixtures          # sample DocModel JSON; valid + invalid validation fixtures
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

### M1 — Schema & DocModel
- [ ] Zod schema for the DocModel: metadata, brand reference, ordered sections, ordered typed blocks.
- [ ] One schema per block type — the **closed** block library (block list from the setup templating catalogue, §1 of the memo).
- [ ] **Every block has a stable `id`.**
- [ ] Brand-token schema; one authoritative brand file.
- [ ] `validate()` rejects invalid documents with clear, located errors.
- [ ] YAML projection: `DocModel -> YAML` and `YAML -> DocModel`.
- **Acceptance:** a fixture DocModel validates; the invalid fixtures all fail with readable errors; **YAML round-trip is byte-stable and lossless** (automated test); no block type exists outside the closed library.

### M2 — Renderer + HTML/PDF
- [ ] One React component per block type under `/renderer/blocks`.
- [ ] `DocumentRenderer` composes blocks into an HTML document; brand tokens applied from the brand file.
- [ ] Playwright PDF export; running headers/footers and page numbers via `page.pdf()` `headerTemplate`/`footerTemplate`; page-break CSS (`break-inside: avoid`).
- **Acceptance:** a fixture DocModel renders to HTML and to PDF; **HTML and PDF are produced by the same Chromium render and match visually**; the renderer runs with **no editor present**; brand is consistent across two different fixture documents.

### M3 — LLM interface
- [ ] Outline-driven generation: structured outline in → schema-valid DocModel out.
- [ ] Generated output is **validated against the schema before acceptance**; invalid output is rejected, never silently used.
- [ ] Scoped block patch: a `BlockPatch` changes exactly one block by `id`.
- **Acceptance:** given a sample outline, the LLM produces a valid DocModel; a scoped patch modifies only its target block and leaves all others byte-identical; malformed LLM output is rejected with a clear error.

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
