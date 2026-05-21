# Implementation Tasks — Document System v1

**Purpose:** decompose `BUILD_BRIEF.md` milestones (M0–M6) into atomic tasks of ≤4 hours each.

**How to use this doc:**
- Work tasks in dependency order — IDs are roughly topological.
- Each task has: **inputs** (files/types it needs), **outputs** (files it produces), **acceptance** (how you know it's done), **est.** (hours).
- Mark `[x]` when done. Add to PR descriptions: "Closes T-23, T-24, T-25."
- When a task is larger than 4h, split it. When it's < 30min, batch with neighbors.

**Companions:**
- `TYPES.md` — type definitions referenced by tasks
- `BLOCK_IMPLEMENTATION_GUIDE.md` — copy-pattern for block tasks
- `SETUP_PIPELINE.md` — full spec for setup pipeline tasks
- `SETUP_INSTALL_FLOW.md` — per-consultant install CLI flow (T-73)
- `TAURI_IPC.md` — JS↔Rust command surface (T-02, T-60, fs commands)
- `YAML_FORMAT.md` — byte-stable formatter config (T-40)
- `UI_REVIEW_PANEL.md` — review-panel design (T-92 onwards)
- `UI_LIBRARY.md` — library UI design (T-84)
- `../starter/` — drop-in configs for T-01 through T-09
- `../reference/primitives/` — block-primitives every renderer depends on
- `../reference/callout/` — worked simple block (copy 14 times)
- `../reference/chart/` — worked complex block (cross-field schema + side panel + SSR)
- `../reference/mapping/` — worked top-level DocModel ⇄ editor orchestrator
- `../examples/` — fixtures for acceptance tests

**Conventions:**
- Tasks prefixed `T-NN`. NN is ordering, not strict; cross-phase deps are noted.
- "**est.**" is best-case for an experienced TS/React developer. Multiply ×1.5 for an LLM, ×2 for a junior.

---

## Phase 0 — M0: Project Scaffold

Foundation. Nothing else compiles until this is done.

### T-01 · Initialize repo and Vite + React + TypeScript app
- **Inputs:** `starter/package.json`, `starter/tsconfig.json`, `starter/vite.config.ts`, `starter/vitest.config.ts` — copy these in
- **Outputs:** `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`
- **Acceptance:** `npm install && npm run dev` opens a blank app at localhost; `tsc --noEmit` passes.
- **est.** 0.5h (drop-in from `starter/`; was 1h without scaffolding)

### T-02 · Set up Tauri 2.x desktop shell
- **Inputs:** Vite app from T-01; `starter/src-tauri/{tauri.conf.json,Cargo.toml,build.rs,capabilities/,src/main.rs,src/lib.rs,src/ipc/}` — copy these in; `docs/TAURI_IPC.md` for the command surface
- **Outputs:** `src-tauri/` (Cargo.toml, main.rs, lib.rs, tauri.conf.json, build script, capabilities); stubs for each IPC command in `src-tauri/src/ipc/{fs,keychain,config,cost,pdf}.rs`
- **Acceptance:** `npm run tauri:dev` opens the Vite app in a native window on macOS/Windows/Linux; `npm run tauri:build` produces an unsigned binary; all IPC command stubs registered (even if not yet implemented — they appear in the `generate_handler!` macro).
- **est.** 2h (drop-in from `starter/` + stub registration; was 3h)

### T-03 · Pin exact dependency versions
- **Inputs:** none
- **Outputs:** updated `package.json` with exact versions for the approved app/runtime, setup-only, and dev-only dependencies in `BUILD_BRIEF.md` §2
- **Acceptance:** `npm ls` shows the pinned versions; no `^` or `~` ranges in dependencies.
- **est.** 0.5h

### T-04 · Set up ESLint + Prettier + EditorConfig
- **Inputs:** T-01
- **Outputs:** `.eslintrc.cjs`, `.prettierrc`, `.editorconfig`
- **Acceptance:** `npm run lint` runs and reports zero issues on the empty app.
- **est.** 1h

### T-05 · Set up Vitest with one passing sample test
- **Inputs:** T-01
- **Outputs:** `vitest.config.ts`, `tests/sample.test.ts`
- **Acceptance:** `npm test` runs and the sample test passes.
- **est.** 0.5h

### T-06 · Create the full folder structure (empty)
- **Inputs:** BUILD_BRIEF.md repo layout
- **Outputs:** all directories from the BUILD_BRIEF, each with a `.gitkeep` or `README.md`
- **Acceptance:** `tree src setup tests fixtures generated-blocks templates` matches the BUILD_BRIEF layout.
- **est.** 0.5h

### T-07 · Add npm scripts
- **Inputs:** T-01, T-02, T-04, T-05
- **Outputs:** updated `package.json` with: `dev`, `build`, `lint`, `test`, `validate`, `export:pdf`, `tauri:dev`, `tauri:build`, `setup:scan-demos`, `setup:install`, `setup:validate`, `setup:regenerate`
- **Acceptance:** all listed scripts exist; `dev` and `build` run clean; the `setup:*` scripts can be empty stubs.
- **est.** 0.5h

### T-08 · Set up CI (GitHub Actions or equivalent)
- **Inputs:** T-04, T-05
- **Outputs:** `.github/workflows/ci.yml` running `scripts/check-specs`, lint, test, and build on every push
- **Acceptance:** Push to the repo triggers CI; spec parsing, lint, test, and build pass; failure on any block blocks the PR.
- **est.** 1.5h

### T-09 · Write project README with quickstart
- **Inputs:** T-01–T-08
- **Outputs:** `README.md` covering: install, dev loop, project layout, link to all docs in this repo
- **Acceptance:** A fresh contributor can follow the README and get a running app in < 15 minutes.
- **est.** 1h

**M0 acceptance gate (from BUILD_BRIEF):** `npm run build` passes with `tsc --noEmit`; the empty app renders; CI/lint is green. ✅ when T-01 through T-09 are complete.

---

## Phase 1 — M1a–M1d: Schema, Block Catalogue, and Setup Pipeline

The single largest phase. Plan ≥ 6 weeks of focused work.

### Sub-phase 1A — Core schema (no blocks yet)

### T-10 · Implement `StableIdSchema` and `AssetPathSchema`
- **Inputs:** TYPES.md §3a, §3b
- **Outputs:** `src/schema/stable-id.ts`, `src/schema/asset-path.ts` + tests
- **Acceptance:** `StableIdSchema` accepts UUIDs and readable kebab-case IDs like `"b1-prose-01"`; rejects empty strings, spaces, and path-like IDs. `AssetPathSchema` accepts `"assets/x.jpg"` and `"$brand:logo.primary"`; rejects `"/abs/path"`, `"../foo"`, and `"http://..."` with clear error messages.
- **est.** 1.5h

### T-11 · Implement `ProseMirrorFragmentSchema`
- **Inputs:** TYPES.md §3c
- **Outputs:** `src/schema/prosemirror-fragment.ts` + tests
- **Acceptance:** accepts a minimal `{ type: "doc", content: [] }`; rejects bare strings.
- **est.** 1h

### T-12 · Implement `BlockBaseSchema`
- **Inputs:** TYPES.md §3
- **Outputs:** `src/schema/blocks/index.ts` (just the base for now; union added in T-28)
- **Acceptance:** base requires `id` (`StableIdSchema`) and `type` (string); accepts optional `note`; rejects unknown keys.
- **est.** 1h

### T-13 · Implement `MetaSchema`
- **Inputs:** TYPES.md §2
- **Outputs:** `src/schema/meta.ts` + tests
- **Acceptance:** validates `examples/sample-proposal.yaml`'s `meta` block; rejects missing required fields.
- **est.** 1.5h

### T-14 · Implement `CommentSchema` + `ThreadEntrySchema`
- **Inputs:** TYPES.md §5, `examples/sample-comment-thread.json`
- **Outputs:** `src/schema/comment.ts` + tests
- **Acceptance:** validates the sample thread JSON; rejects threads without an initial instruction; rejects unknown `kind` values.
- **est.** 2h

### T-15 · Implement `BlockPatchSchema`
- **Inputs:** TYPES.md §6, `examples/sample-block-patch.json`
- **Outputs:** `src/schema/block-patch.ts` + tests
- **Acceptance:** validates all three op shapes from the JSON fixture; rejects op variants with wrong required fields.
- **est.** 2h

### T-16 · Implement `BrandTokensSchema`
- **Inputs:** TYPES.md §7, `brand.example.yaml`
- **Outputs:** `src/schema/brand.ts` + tests
- **Acceptance:** validates `brand.example.yaml` (parsed); rejects missing required `colors.brand.primary`; rejects invalid hex colors.
- **est.** 3h

### T-17 · Implement `SectionSchema` and `SlideSchema`
- **Inputs:** TYPES.md §4, blocks union from T-28
- **Outputs:** `src/schema/containers.ts` + tests
- **Acceptance:** SlideSchema enforces layout enum; SectionSchema requires `blocks.min(1)`.
- **est.** 1h
- **Depends on:** T-28

### T-18 · Implement `DocModelSchema` (top-level)
- **Inputs:** TYPES.md §1
- **Outputs:** `src/schema/docmodel.ts` + tests
- **Acceptance:** discriminated-union on `kind`; `kind: "document"` requires `sections`; `kind: "deck"` requires `slides`.
- **est.** 1h
- **Depends on:** T-17

### T-19 · Implement `validateDocModel` entry point
- **Inputs:** TYPES.md §11
- **Outputs:** `src/schema/validate.ts` + tests using `examples/sample-proposal.yaml`, `examples/sample-deck.yaml`, and the 3 invalid fixtures
- **Acceptance:** valid fixtures return `{ok: true}`; each invalid fixture returns `{ok: false}` with the documented error path; duplicate section, slide, block, or comment IDs fail with the repeated ID and both paths.
- **est.** 2h
- **Depends on:** T-18

### Sub-phase 1B — Brand-token consumption

### T-20 · Implement `BrandProvider` + `useBrandTokens` hook
- **Inputs:** T-16
- **Outputs:** `src/brand-tokens/BrandProvider.tsx`, `src/brand-tokens/useBrandTokens.ts` + tests
- **Acceptance:** components inside `<BrandProvider tokens={...}>` get the tokens via `useBrandTokens()`; throws if used outside provider.
- **est.** 1.5h

### T-21 · Implement `resolveBrandToken(brand, ref)`
- **Inputs:** T-16
- **Outputs:** `src/brand-tokens/resolve.ts` + tests
- **Acceptance:** resolves `"colors.brand.primary"` to the hex string; resolves a one-level alias (e.g. `"colors.semantic.textPrimary"` -> `"neutral.800"` -> `"#1E293B"`); rejects unknown paths.
- **est.** 2h

### T-22 · Implement `resolveAssetPath(brand, sharedFolderPath, docFolderPath, ref)`
- **Inputs:** T-16
- **Outputs:** `src/brand-tokens/resolve-asset.ts` + tests
- **Acceptance:** `"assets/x.jpg"` resolves against `docFolderPath`; `"$brand:logo.primary"` resolves against `sharedFolderPath` + the logo's path; rejects malformed refs.
- **est.** 1.5h

### Sub-phase 1C — The 15 pre-built blocks

For each block: follow `BLOCK_IMPLEMENTATION_GUIDE.md`. Each block produces 4 files (schema, renderer, node, test).

**Estimation guide:** simple blocks (heading, prose, image, divider) ~4h each. Medium (callout, bullet/numbered list, kpi-cards, timeline, team) ~6h. Complex (chart, table, risk-matrix, roadmap, diagram) ~10–12h.

### T-23 · Move `reference/primitives/` to `src/brand-tokens/` + `src/block-primitives/`
- **Inputs:** `reference/primitives/{BrandProvider,useBrandTokens,resolve,resolve-asset,ProseRenderer,block-primitives}.{ts,tsx}`
- **Outputs:** files moved to production paths per `reference/primitives/README.md`; tests in `tests/primitives/`
- **Acceptance:** `BrandProvider` provides tokens; `useBrandTokens` throws outside it; `resolveBrandToken` resolves direct + alias paths; `resolveAssetPath` accepts the two schemes and rejects `..`; `ProseRenderer` renders allowed marks and drops disallowed ones (no `dangerouslySetInnerHTML` anywhere); primitives consume brand tokens.
- **est.** 3h

### T-23b · Reference block: move `reference/callout/` to production paths
- **Inputs:** `reference/callout/*`, primitives from T-23
- **Outputs:** files moved to `src/schema/blocks/callout.ts`, `src/renderer/blocks/Callout.tsx`, `src/editor/nodes/CalloutNode.tsx`, `tests/blocks/callout.test.ts`; imports updated to clean paths
- **Acceptance:** all five test layers pass; the reference's tests pass unmodified after path updates.
- **est.** 2h

### T-24 · Implement `prose` block (4 files)
- **est.** 4h

### T-25 · Implement `heading` block (4 files)
- **est.** 3h

### T-26 · Implement `bullet-list` block (4 files)
- **est.** 5h

### T-27 · Implement `numbered-list` block (4 files)
- **est.** 4h
- **Note:** May share most code with T-26 — refactor common list logic into `src/block-primitives/List.tsx`.

### T-28 · Wire up the `BlockSchema` discriminated union
- **Inputs:** T-23–T-27 + future blocks
- **Outputs:** `src/schema/blocks/index.ts` exports `BlockSchema` as a union of all 15 schemas; new blocks added as they're implemented
- **Acceptance:** A fixture mixing all currently-implemented block types validates; an unknown `type` value fails the discriminator check.
- **est.** 1h initial + 5min per block added
- **Note:** Update this task as each block is added (T-23–T-37).

### T-29 · Implement `kpi-cards` block (4 files)
- **est.** 6h

### T-30 · Implement `image` block (4 files)
- **est.** 4h

### T-31 · Implement `table` block (4 files)
- **Inputs:** BLOCK_IMPLEMENTATION_GUIDE §3 (table notes)
- **est.** 10h
- **Note:** Wrap `@tiptap/extension-table` with a constrained custom node. Cells must be `ProseMirrorFragment`.

### T-32 · Implement `chart` block (4 files + side panel)
- **Inputs:** **`reference/chart/*` — copy these in; they are the worked example.** BLOCK_IMPLEMENTATION_GUIDE §3 (chart notes), ECharts docs.
- **Outputs:** `src/schema/blocks/chart.ts`, `src/renderer/blocks/Chart.tsx`, `src/editor/nodes/ChartNode.tsx`, `src/editor/panels/ChartDataPanel.tsx`, `tests/blocks/chart.test.ts`
- **Acceptance:** 6 test layers pass; cross-field validation works; SSR option-builder produces deterministic output; side panel handles Excel paste (English locale only per O-05).
- **est.** 8h (down from 12h thanks to the worked reference)

### T-33 · Implement `callout` block — see T-23 (reference) ✅

### T-34 · Implement `timeline` block (4 files)
- **est.** 6h

### T-35 · Implement `roadmap` block (4 files)
- **Inputs:** BLOCK_IMPLEMENTATION_GUIDE §3 (roadmap notes)
- **est.** 12h (custom ECharts series; date math)

### T-36 · Implement `risk-matrix` block (4 files)
- **Inputs:** BLOCK_IMPLEMENTATION_GUIDE §3 (risk-matrix notes)
- **est.** 8h

### T-37 · Implement `team` block (4 files)
- **Inputs:** BLOCK_IMPLEMENTATION_GUIDE §3 (team notes); 3 layout sub-renderers
- **est.** 8h

### T-38 · Implement `diagram` block (4 files)
- **Inputs:** BLOCK_IMPLEMENTATION_GUIDE §3 (diagram notes); Mermaid setup
- **est.** 6h
- **Note:** PDF path requires pre-rendering to SVG — coordinate with T-50 (PDF export).

### T-39 · Implement `divider` block (4 files)
- **est.** 3h
- **Note:** Layout-affecting; coordinate with T-50.

### T-40 · YAML round-trip + losslessness test
- **Inputs:** T-19, all blocks T-23–T-39; **`docs/YAML_FORMAT.md` for the exact formatter config and canonicalizer**
- **Outputs:** `src/docmodel/yaml-config.ts`, `src/docmodel/canonicalize.ts`, `src/docmodel/serialize.ts` + tests using `examples/sample-proposal.yaml` and `examples/sample-deck.yaml`
- **Acceptance:** YAML -> DocModel -> YAML produces byte-identical output on the SECOND save (first may differ from source if not already canonical). Test runs on both sample files. Adding a new block type without updating `KEY_ORDERS` in `canonicalize.ts` fails the test with a precise path.
- **est.** 3h (most of the design is in `YAML_FORMAT.md`)

### Sub-phase 1D — Setup AI pipeline

### T-41 · Implement document ingestion (DOCX/PPTX/PDF -> analysis JSON)
- **Inputs:** SETUP_PIPELINE.md §1 Stage 1
- **Outputs:** `src/setup/ingestion/` with one file per format (docx.ts, pptx.ts, pdf.ts) + a combined `analyze.ts`
- **Acceptance:** Given a fixture DOCX in `tests/fixtures/setup-demos/`, produces a `demo-analysis.json` with text content, observed colors, and font families. Same for PPTX, PDF.
- **est.** 8h

### T-42 · Implement brand-extraction LLM call (Stage 2)
- **Inputs:** SETUP_PIPELINE.md §5 Stage 2 prompt, T-41 output
- **Outputs:** `src/setup/extract-brand.ts` + tests
- **Acceptance:** Given a sample demo-analysis.json, calls the LLM and produces a `brand.draft.yaml` that passes `BrandTokensSchema`. On validation failure, retries up to 2× with corrective re-prompt.
- **est.** 6h

### T-43 · Implement catalogue-diff LLM call (Stage 3)
- **Inputs:** SETUP_PIPELINE.md §5 Stage 3 prompt
- **Outputs:** `src/setup/catalogue-diff.ts` + tests
- **Acceptance:** Produces a valid `catalogue-diff.json` with `usedBlocks`, `unusedBlocks`, `newBlockProposals`. Returns `{escalate: true}` if proposals > 10.
- **est.** 4h

### T-44 · Implement the scaffold templates (literal files)
- **Inputs:** SETUP_PIPELINE.md §3
- **Outputs:** `src/setup/scaffold/SCHEMA_SCAFFOLD.ts.template`, `RENDERER_SCAFFOLD.tsx.template`, `NODE_SCAFFOLD.tsx.template`, `TEST_SCAFFOLD.test.ts.template`
- **Acceptance:** Each template has the AI_FILL regions marked clearly; non-AI_FILL regions match the reference callout block's pattern exactly.
- **est.** 4h

### T-45 · Implement code-generation LLM call (Stage 4)
- **Inputs:** SETUP_PIPELINE.md §5 Stage 4 prompt, T-44 scaffolds, T-43 proposals
- **Outputs:** `src/setup/generate-block.ts` + tests
- **Acceptance:** Given a sample proposal from T-43, produces four files. Each file is syntactically valid TypeScript (verified by running `tsc --noEmit` against them).
- **est.** 8h

### T-46 · Implement the lint enforcement (whitelist + forbidden patterns + hex colors)
- **Inputs:** SETUP_PIPELINE.md §4; **ADR-0001** for the extended forbidden patterns list (per D-36)
- **Outputs:** `src/setup/lint-generated.ts` + tests
- **Acceptance:** A deliberately-malicious generated file (containing `dangerouslySetInnerHTML`) fails lint. A clean generated file passes. Hex colors in string literals are rejected. **Per ADR-0001:** also rejects `parent`, `top`, `window.localStorage`, `document.cookie`, `postMessage`, and obvious intrinsic monkey-patching (`Array.prototype.X = ...`).
- **est.** 7h (extended pattern list adds ~1h)

### T-46b · Implement the runtime render-budget watchdog (D-36, ADR-0001)
- **Inputs:** ADR-0001
- **Outputs:** `src/block-primitives/RenderWatchdog.tsx` — a higher-order component that wraps every generated-block React component and measures per-render duration via `performance.now()`. If a render exceeds 50ms, the watchdog unmounts the block and replaces it with an error placeholder (`<RenderFailedPlaceholder reason="render-budget-exceeded" />`).
- **Acceptance:** A benign generated block renders normally with no observable overhead (< 1ms wrapper cost). A deliberately-bad block that allocates in a hot loop is unmounted within 100ms of exceeding the budget; the error placeholder appears in its place; no other blocks in the editor are affected.
- **est.** 3h

### T-47 · Implement pending/active loading discipline
- **Inputs:** D-09 mitigation 4
- **Outputs:** `src/setup/load-generated-blocks.ts`
- **Acceptance:** The block loader reads from `/generated-blocks/active/` ONLY. If a block file is placed in `/pending/`, the app does NOT load it (verified by automated test).
- **est.** 3h

### T-48 · Implement the `setup:scan-demos` CLI command end-to-end
- **Inputs:** T-41 through T-47
- **Outputs:** `src/setup/scan-demos.ts` + an updated `package.json` script
- **Acceptance:** `npm run setup:scan-demos -- --input tests/fixtures/setup-demos --output /tmp/setup-output` produces all expected outputs (brand.draft.yaml, catalogue-diff.json, generated-blocks/pending/, setup-report.md).
- **est.** 3h

### T-49 · Implement the `setup:regenerate` and `setup:validate` CLI commands
- **Inputs:** T-48
- **Outputs:** `src/setup/regenerate.ts`, `src/setup/validate.ts`
- **Acceptance:** Both commands run; regenerate produces drift-detection output; validate runs lint over `/active/` and reports findings.
- **est.** 4h

**M1a acceptance gate:** T-10 through T-19 pass, valid fixtures validate, invalid fixtures fail with located errors, and duplicate IDs fail.

**M1b acceptance gate:** all pre-built blocks T-23 through T-39 pass schema, renderer, mapping, and editor-node tests, and T-40 round-trip passes.

**M1c acceptance gate:** T-41 through T-48 produce complete setup output for fixture demos, and T-46 rejects a malicious generated block.

**M1d acceptance gate:** T-49 regenerates reviewed generated blocks and routes drift to `/pending/` for human re-review.

---

## Phase 2 — M2: Renderer + HTML/PDF

### T-50 · Implement `ProseRenderer` (rich-text serializer)
- **Inputs:** TYPES.md §3c
- **Outputs:** `src/renderer/ProseRenderer.tsx` + tests
- **Acceptance:** renders ProseMirror JSON to HTML with marks (bold, italic, link, code, underline) applied; deterministic; SSR-compatible.
- **est.** 4h

### T-51 · Implement `DocumentRenderer`
- **Inputs:** T-50 + all block renderers
- **Outputs:** `src/renderer/DocumentRenderer.tsx` + tests
- **Acceptance:** Given a valid DocModel (kind: "document"), renders a full HTML doc. Brand tokens applied via BrandProvider. Renders `examples/sample-proposal.yaml` end-to-end.
- **est.** 4h

### T-52 · Set up Playwright for headless Chromium PDF export
- **Inputs:** Vite build, T-51
- **Outputs:** `src/export/pdf.ts`, `scripts/export-pdf.mjs` CLI
- **Acceptance:** `npm run export:pdf -- examples/sample-proposal.yaml output.pdf` produces a PDF file > 0 bytes.
- **est.** 4h

### T-53 · Implement running headers and footers via Playwright `page.pdf()`
- **Inputs:** T-52, brand.example.yaml `page.header`/`page.footer`
- **Outputs:** updated `src/export/pdf.ts` with `headerTemplate` / `footerTemplate`
- **Acceptance:** Exported PDF has a header showing the logo + project title; footer showing confidentiality text + "Page N of M".
- **est.** 3h

### T-54 · Implement page-break CSS rules
- **Inputs:** T-51, T-52
- **Outputs:** `src/renderer/page-breaks.css` + updates to block renderers
- **Acceptance:** Charts, tables, headings don't split across pages (verified by exporting a long fixture with a chart near the page boundary and checking the PDF visually + via PDF text extraction).
- **est.** 3h

### T-55 · Add the `divider` block's page-break handling
- **Inputs:** T-39, T-54
- **Outputs:** updates to `src/renderer/blocks/Divider.tsx`
- **Acceptance:** A divider block in a flowing document forces a page break in the exported PDF.
- **est.** 1h

### T-56 · Add Mermaid pre-rendering for PDF export
- **Inputs:** T-38, T-52
- **Outputs:** updates to `src/export/pdf.ts`: detect `diagram` blocks, pre-render via Mermaid Node API to SVG, substitute into the HTML before PDF render
- **Acceptance:** A document with a Mermaid diagram exports to a PDF showing the rendered diagram (not raw Mermaid source).
- **est.** 4h

### T-57 · Add ECharts pre-rendering for PDF export
- **Inputs:** T-32, T-52
- **Outputs:** updates to `src/export/pdf.ts`: detect `chart` blocks, pre-render via ECharts SSR to SVG, substitute into HTML
- **Acceptance:** A document with a chart exports to a PDF showing the rendered chart.
- **est.** 4h

### T-58 · Implement HTML vs PDF render parity test
- **Inputs:** T-51, T-52
- **Outputs:** `tests/render-parity.test.ts`
- **Acceptance:** Render `examples/sample-proposal.yaml` to HTML and to PDF. Extract text from PDF. Assert that all text in the HTML appears in the PDF (modulo whitespace differences). All chart titles, table headers, KPI values match.
- **est.** 3h

### T-59 · Brand consistency test across two fixture docs
- **Inputs:** T-51
- **Outputs:** `tests/brand-consistency.test.ts`
- **Acceptance:** Render `sample-proposal.yaml` and `sample-deck.yaml`. Assert both use the same set of font families, color values, spacing units (verified by parsing the HTML's inline styles).
- **est.** 2h

**M2 acceptance gate:** fixture DocModels render to HTML and PDF; HTML and PDF match visually; renderer runs with no editor present; brand consistent across two different fixtures.

---

## Phase 3 — M3: LLM Interface

### T-60 · Implement provider-agnostic LLM client
- **Inputs:** TYPES.md §10 AppConfig
- **Outputs:** `src/llm/client.ts` with adapters for `openai`, `anthropic` (and stubs for `azure`, `local`)
- **Acceptance:** A `LLMClient.call(modelKind, request)` routes to the configured provider; API key fetched from OS keychain via Tauri command.
- **est.** 6h

### T-61 · Implement prompt caching (Anthropic format) and cached-token tracking
- **Inputs:** T-60, D-13
- **Outputs:** updates to `src/llm/client.ts` with `cache_control` markers on system, schema, brand, doc context
- **Acceptance:** A second call within the cache TTL returns a high `cachedTokens` value in the response; cost computation reflects the cache discount.
- **est.** 3h

### T-62 · Implement outline-driven generation (initial doc creation)
- **Inputs:** T-60, TYPES.md, examples/sample-proposal.yaml as few-shot
- **Outputs:** `src/llm/generate-doc.ts` + tests
- **Acceptance:** Given a structured outline, produces a schema-valid DocModel. Invalid output is rejected, never silently used.
- **est.** 6h

### T-63 · Implement `BlockPatch` application logic
- **Inputs:** TYPES.md §6, T-15
- **Outputs:** `src/docmodel/patch.ts` + tests
- **Acceptance:** `applyPatch(doc, patch)` produces a new DocModel with the patch applied. The target block is modified; all other blocks are byte-identical. Invalid patches (wrong blockId, off-schema) are rejected before application.
- **est.** 4h

### T-64 · Implement batched comment-to-AI request builder
- **Inputs:** T-60, T-61, D-13
- **Outputs:** `src/llm/batch-comments.ts`
- **Acceptance:** Given an array of pending comments, builds one structured request with prompt-cached context. Returns parsed `BatchedCommentResponse`.
- **est.** 4h

### T-65 · Implement per-patch validation + corrective retry
- **Inputs:** T-64, T-15
- **Outputs:** updates to `src/llm/batch-comments.ts`
- **Acceptance:** When a patch in a batch response fails validation, the failure is retried one-at-a-time (max 2 retries) with a corrective re-prompt. After exhaustion, the comment is marked failed with raw output available.
- **est.** 4h

### T-66 · Implement threaded comment context assembly
- **Inputs:** T-14, D-12
- **Outputs:** `src/llm/thread-context.ts`
- **Acceptance:** Given a comment with a multi-round thread, produces the correctly-ordered `thread[]` array of `{role, content}` for the LLM request. Matches `examples/sample-llm-batch-request.json` structure.
- **est.** 2h

### T-67 · Set up SQLite for cost ledger
- **Inputs:** TYPES.md §9 CostLedgerRow, D-34
- **Outputs:** `src/cost-ledger/db.ts` (better-sqlite3 wrapper), schema migration
- **Acceptance:** SQLite db created at the OS config path; schema matches `CostLedgerRowSchema`. Schema enforces only the cost columns (no prompt/response content column exists).
- **est.** 3h

### T-68 · Implement cost-ledger insert on every LLM call
- **Inputs:** T-60, T-67
- **Outputs:** updates to `src/llm/client.ts` to insert a row after each call
- **Acceptance:** After a successful LLM call, exactly one row appears in the ledger with the correct token counts and computed cost. Failed calls also insert a row (with zero output tokens).
- **est.** 2h

### T-69 · Implement monthly limit enforcement
- **Inputs:** TYPES.md §9 CostSummary, T-67
- **Outputs:** `src/cost-ledger/limits.ts` + tests
- **Acceptance:** When current-month spend ≥ 80%, returns a warning flag. At 100%, blocks further LLM calls until next month (or admin override). Limit values come from AppConfig.
- **est.** 4h

### T-70 · Implement 13-month sliding-window retention
- **Inputs:** T-67, D-34
- **Outputs:** `src/cost-ledger/prune.ts` (runs on app launch + nightly via a setInterval)
- **Acceptance:** Rows older than 13 months are deleted on each prune cycle. Verified by inserting an old fixture row and confirming it's gone after pruning.
- **est.** 2h

### T-71 · Implement `Settings → My LLM Spend` view
- **Inputs:** T-67, T-69
- **Outputs:** `src/ui/settings/CostLedgerView.tsx`
- **Acceptance:** Shows a table of all cost rows; aggregate panels for current month, 30-day rolling, per-doc breakdown; "Clear all cost history" button works with confirmation.
- **est.** 4h

### T-72 · Implement an automated test verifying the ledger never records prompt content
- **Inputs:** T-67, T-68
- **Outputs:** `tests/cost-ledger-no-content.test.ts`
- **Acceptance:** After 10 LLM calls with varied prompts, the SQLite db contains zero rows where any field matches even partial prompt text (verified by searching every column for a sentinel string in the prompts).
- **est.** 2h

### T-73 · Install CLI flow + privacy notice + cost-tracking toggle
- **Inputs:** **`docs/SETUP_INSTALL_FLOW.md` for the exact prompts, defaults, validation.** D-34.
- **Outputs:** `src/setup/install.ts` implementing all 7 steps; cost-tracking enable/disable toggle in Settings; non-interactive mode via CLI flags + env vars.
- **Acceptance:** All 7 steps work interactively; non-interactive mode works with all flags; API keys land in OS keychain (verified via `get_secret` IPC); `config.yaml` validates against `AppConfigSchema`; cost ledger SQLite is initialized; consultant cannot proceed past privacy notice without affirmative consent.
- **est.** 5h (most of the design is in SETUP_INSTALL_FLOW.md)

**M3 acceptance gate:** outline -> valid DocModel; scoped patch affects only target block; malformed LLM output rejected; 20-comment batch produces 20 patches (with caching); follow-up includes prior proposal in next request; cost ledger never records prompt/response content (verified by T-72); monthly limit enforced; "Clear history" wipes cleanly.

---

## Phase 4 — M4: WYSIWYG Editor

### T-74 · Set up TipTap editor with StarterKit
- **Inputs:** T-01
- **Outputs:** `src/editor/Editor.tsx` (initial)
- **Acceptance:** Editor renders, accepts text input, basic formatting (bold/italic) works.
- **est.** 3h

### T-75 · Register all 15 block TipTap nodes in the editor
- **Inputs:** T-23–T-39 (all block nodes), T-74
- **Outputs:** updates to `src/editor/Editor.tsx`
- **Acceptance:** Editor can insert any of the 15 block types via the `insertXxx` commands.
- **est.** 2h

### T-76 + T-77 · Implement DocModel ⇄ ProseMirror orchestrator
- **Inputs:** all per-block mapping helpers from T-23b–T-39; **`reference/mapping/mapping.ts` is the worked example — copy and extend.**
- **Outputs:** `src/editor/mapping.ts` implementing both `docModelToProseMirror` and `proseMirrorToDocModel` with the per-block dispatch + `assertNever` exhaustiveness check.
- **Acceptance:** matches T-89 (the round-trip test fixture). Adding a new block type without adding both dispatch arms is a compile-time error.
- **est.** 3h (down from 8h thanks to the worked reference)

### T-78 · Implement closed-schema enforcement in the editor
- **Inputs:** T-75
- **Outputs:** TipTap schema config + tests
- **Acceptance:** The editor cannot produce content with unknown block types or off-schema attrs. Pasting HTML with disallowed elements drops them.
- **est.** 3h

### T-79 · Implement block-palette UI
- **Inputs:** `blocks.catalogue.yaml`
- **Outputs:** `src/editor/BlockPalette.tsx`
- **Acceptance:** Floating palette shows all 15 blocks + any active generated blocks; clicking inserts the block; description text comes from `llmUsage.when`.
- **est.** 4h

### T-80 · Implement block drag-reorder
- **Inputs:** T-74
- **Outputs:** `src/editor/extensions/DragReorder.ts`
- **Acceptance:** Blocks can be reordered via drag handle. Order persists in the DocModel.
- **est.** 4h

### T-81 · Implement grid-anchored placement for slide layouts
- **Inputs:** T-77, slide layouts
- **Outputs:** `src/editor/SlideLayoutEditor.tsx`
- **Acceptance:** When editing a slide, blocks snap to the layout's defined slots; consultant cannot place blocks outside slots.
- **est.** 6h (slated to v1.1 — flag with TODO in M4)

### T-82 · Implement autosave with debounce
- **Inputs:** D-05, TYPES.md AppConfig.editor.autosaveDebounceMs
- **Outputs:** `src/editor/autosave.ts`
- **Acceptance:** After each edit, saves the YAML to disk after a debounce (default 2s). Existing in-memory undo stack unaffected.
- **est.** 3h

### T-83 · Implement undo/redo with operation-level granularity
- **Inputs:** D-06, D-07
- **Outputs:** Reuse TipTap's history extension; ensure each comment-accept also pushes an undo entry.
- **Acceptance:** Each text edit and each comment accept is a separate undo step. Cmd-Z undoes one operation at a time.
- **est.** 4h

### T-84 · Implement library UI (D-27)
- **Inputs:** TYPES.md MetaSchema, AppConfig.paths.cloudSyncRoot, **`docs/UI_LIBRARY.md` for the wireframe + state model + component breakdown.**
- **Outputs:** all components per UI_LIBRARY.md §"File locations" (LibraryView, FilterSidebar, SearchBar, DocList, DocCard, index-builder, filter, thumbnail).
- **Acceptance:** matches UI_LIBRARY.md §"Acceptance checklist (per T-84)" — 11 items including 500-doc index in < 2s, all five filter groups, grid+list views, lazy thumbnails.
- **est.** 8h (split into 3 sub-tasks per the design: scan + cards, filters, thumbnails)

### T-85 · Implement Save As (creates a folder, not a file)
- **Inputs:** D-19
- **Outputs:** updates to file-save flow in editor
- **Acceptance:** "Save As" prompts for a folder name; creates `<name>/` containing `<name>.yaml` (or `doc.yaml`); future saves overwrite the same YAML in place.
- **est.** 3h

### T-86 · Implement Open (accepts folder or YAML inside one)
- **Inputs:** D-19
- **Outputs:** updates to file-open flow
- **Acceptance:** Open dialog accepts a folder containing a valid YAML, or any YAML inside one (auto-resolves to the parent). Bare YAML in cloud root prompts "wrap in folder?".
- **est.** 3h

### T-87 · Implement asset-missing and orphaned-asset linting
- **Inputs:** D-10, D-21
- **Outputs:** `src/editor/asset-linter.ts`
- **Acceptance:** On open, the editor banners missing referenced assets + orphan files in the assets/ folder. Both are warnings, not blockers. "Locate" button lets consultant point to a moved file.
- **est.** 4h

### T-88 · Implement chart-data side panel
- **Inputs:** T-32, D-24
- **Outputs:** `src/editor/panels/ChartDataPanel.tsx`
- **Acceptance:** Selecting a chart block opens a side panel with: data grid, chart type, title, axis labels, brand-constrained color choice, legend position. Excel paste fills the grid.
- **est.** 8h

### T-89 · DocModel <-> editor mapping losslessness test (acceptance criterion)
- **Inputs:** T-76, T-77; **`reference/mapping/*` — copy `mapping.ts` and `mapping.test.ts` in**
- **Outputs:** `src/editor/mapping.ts`, `tests/mapping-roundtrip.test.ts`
- **Acceptance:** For every fixture in `examples/`, `proseMirrorToDocModel(docModelToProseMirror(doc))` deep-equals `doc`. The compile-time `assertNever(_b: never)` catches missing block-type dispatch arms.
- **est.** 1.5h (mostly copy from reference; was 2h)

### T-89b · Build the perf-spike anchor fixture (D-35, D-39)
- **Inputs:** D-35; all blocks T-23b through T-39 implemented
- **Outputs:** `tests/perf/fixtures/anchor-doc.yaml` — a DocModel matching the D-35 anchor: ~200 node-views, 10 chart blocks (mixed types), 2 tables (one 30×6), dozens of inline comment marks.
- **Acceptance:** Fixture validates against `DocModelSchema`. Loading the fixture into the editor produces 200±20 mounted node-views.
- **est.** 1.5h

### T-89c · Build the perf benchmark harness (D-39)
- **Inputs:** T-89b; D-37 (lazy ECharts), D-38 (table wrap)
- **Outputs:** `tests/perf/benchmark.test.ts` + `tests/perf/README.md` + CI hook
- **Acceptance:** Harness runs in a real browser (Playwright; happy-dom lacks the perf APIs needed) and emits a `docs/perf-spike-results.md` report. Asserts all 6 metrics against D-39 targets:
  - Cold doc open: < 1s
  - First chart paint on scroll-into-view: < 200ms
  - Table mount: < 150ms
  - Table cell typing latency: < 16ms
  - Table cell navigation latency: < 16ms
  - Memory growth over 30-min editing session: < 100MB linear growth
- **Failure mode:** any missed target fails CI on PRs touching `src/editor/`, `src/renderer/blocks/`, or `src/block-primitives/`. Maintainer must either fix the regression or explicitly bump the target in DECISIONS.md D-39.
- **est.** 5h

### T-89d · Build the watchdog adversarial test (D-39)
- **Inputs:** T-46b (watchdog implementation), T-89b
- **Outputs:** `tests/perf/watchdog-validation.test.ts`
- **Acceptance:** A test fixture loads a generated block that allocates in a hot loop (a `while(true) { x.push(...) }` synchronous loop, or an unbounded `useEffect` that creates state on every render). The watchdog unmounts the block within 100ms of exceeding the 50ms render budget. The `<RenderFailedPlaceholder>` appears in the block's slot. Other blocks in the editor remain functional. The test asserts the editor's overall responsiveness (typing in a separate prose block remains < 16ms during and after the kill).
- **est.** 2h

**M4 acceptance gate:** load + edit + save -> lossless round-trip; consultant can add/remove/reorder blocks; off-schema content impossible; consultants never see YAML/JSON. **Perf gate (D-39):** T-89c emits a report with all 6 metrics passing; T-89d confirms the watchdog kills runaway blocks.

---

## Phase 5 — M5: Comment-to-AI

### T-90 · Implement the comment mark (inline highlight)
- **Inputs:** D-12
- **Outputs:** `src/comments/CommentMark.ts` (custom ProseMirror mark)
- **Acceptance:** Consultant can highlight text and apply the mark; the marked range is visually distinguished; the mark survives text editing (anchored by id).
- **est.** 4h

### T-91 · Implement comment creation flow
- **Inputs:** T-90, T-14
- **Outputs:** `src/comments/CreateComment.tsx` (popup on highlight)
- **Acceptance:** On highlight, a popup lets consultant type an instruction. Submit creates a Comment in `DocModel.comments[]` with status "open" and a single "instruction" thread entry.
- **est.** 3h

### T-92 · Implement comment review panel (mode B — default)
- **Inputs:** T-91, D-25, **`docs/UI_REVIEW_PANEL.md` for wireframe + state model + per-card behavior**
- **Outputs:** all components per UI_REVIEW_PANEL.md §"File locations" (ReviewPanel, ProposalCard, DiffPreview, ProseDiff, FieldsDiff, FollowUpInput, BulkActions).
- **Acceptance:** matches UI_REVIEW_PANEL.md §"Acceptance checklist (per T-92)" — 11 items including keyboard shortcuts, conflict detection (T-99), failed proposals, bulk actions with confirmation.
- **est.** 8h

### T-93 · Implement inline track-changes review (mode A)
- **Inputs:** T-91, D-25
- **Outputs:** `src/comments/InlineReview.tsx`
- **Acceptance:** Toggle to inline mode shows AI proposals inline (red strikethrough + green inserts) with floating accept/reject pills.
- **est.** 6h

### T-94 · Implement two-pane diff review (mode C)
- **Inputs:** T-91, D-25
- **Outputs:** `src/comments/DiffReview.tsx`
- **Acceptance:** Toggle to diff mode shows current doc on left, proposed doc on right; keyboard nav (j/k/y/n) works.
- **est.** 6h

### T-95 · Implement review-mode toggle + per-consultant persistence
- **Inputs:** T-92, T-93, T-94, AppConfig.editor.reviewMode
- **Outputs:** `src/ui/ReviewModeToggle.tsx`
- **Acceptance:** Segmented control in toolbar; cmd+shift+R cycles; choice persists in config; switching modes preserves accept/reject/pending state.
- **est.** 3h

### T-96 · Implement batch submit ("Process all")
- **Inputs:** T-64 (batched LLM), T-91
- **Outputs:** `src/comments/BatchSubmit.tsx`
- **Acceptance:** Button submits all open comments with new follow-ups in one batch. UI shows per-comment status (pending/done/failed).
- **est.** 4h

### T-97 · Implement follow-up queue
- **Inputs:** T-92, D-12
- **Outputs:** updates to ReviewPanel.tsx
- **Acceptance:** Clicking "Follow up" on a card opens a text input; queues the follow-up locally. Footer shows "[Send N follow-ups]" button to ship the queue in the next batch.
- **est.** 4h

### T-98 · Implement Accept/Reject (with undo)
- **Inputs:** T-63 (applyPatch), T-83 (undo)
- **Outputs:** updates to ReviewPanel.tsx, ApplyComment.ts
- **Acceptance:** Accept applies the patch to the DocModel and updates the comment's status. Each accept is its own undo step. Reject marks the comment rejected without modifying the doc.
- **est.** 3h

### T-99 · Implement conflict detection (overlapping patches in same block)
- **Inputs:** T-92
- **Outputs:** `src/comments/ConflictDetector.ts`
- **Acceptance:** Two proposed patches targeting overlapping ranges in the same block are flagged with a yellow "Conflict" badge; consultant must pick one before either can be accepted.
- **est.** 3h

### T-100 · Implement reviewer mode (read-only with comments)
- **Inputs:** D-26
- **Outputs:** `src/comments/ReviewerMode.tsx`
- **Acceptance:** "Open as reviewer" loads the doc read-only; comment creation works but block editing is disabled; reviewer comments are tagged role: "reviewer"; reviewers cannot trigger AI from their comments.
- **est.** 4h

### T-101 · Test: comments survive save/reload and YAML round-trip
- **Inputs:** T-91, T-40
- **Outputs:** `tests/comments-roundtrip.test.ts`
- **Acceptance:** Create comments, save, reload — all comments present with original block anchors. YAML round-trip preserves comments byte-stably.
- **est.** 2h

### T-102 · Test: AI never edits outside the comment's target block
- **Inputs:** T-63, T-64
- **Outputs:** `tests/ai-scope-enforcement.test.ts`
- **Acceptance:** Sample a batch of 20 AI responses; for each, assert that only the target blockId was modified in the DocModel; all other blocks byte-identical.
- **est.** 2h

**M5 acceptance gate:** highlight -> comment -> AI proposal -> accept/reject works; comments survive save/reload + YAML round-trip; batch mode works; AI never edits outside the comment's block.

---

## Phase 6 — M6: Deck Renderer (v1.1)

### T-103 · Implement DeckRenderer with layout dispatch
- **Inputs:** T-51
- **Outputs:** `src/renderer/DeckRenderer.tsx`
- **Acceptance:** Given a DocModel (kind: "deck"), renders one HTML "slide" per slide entry. Layout determined by `slide.layout`.
- **est.** 4h

### T-104 · Implement the 15 slide layouts (one component each)
- **Inputs:** T-103, D-30, `brand.deck.*`
- **Outputs:** `src/renderer/layouts/<Layout>.tsx` × 15 (cover, section-divider, agenda, title-body, two-column, three-column, chart-full, chart-commentary, table, quote, process-timeline, team, kpis, image-caption, closing)
- **Acceptance:** Each layout renders a slide using brand tokens; block-content slots resolved per layout's design.
- **est.** 25h total (~1.5h per layout)

### T-105 · Implement deck PDF export
- **Inputs:** T-103, T-52
- **Outputs:** updates to `src/export/pdf.ts` to handle `kind: "deck"`
- **Acceptance:** Deck exports to a PDF with one page per slide, 16:9 aspect by default.
- **est.** 3h

### T-106 · Test: deck reuses schema, editor, and comment system unchanged
- **Inputs:** T-103, M4, M5
- **Outputs:** `tests/deck-reuse.test.ts`
- **Acceptance:** A sample deck loads in the editor; comments work; same schema validates; no deck-specific schema branches exist outside the kind discriminator.
- **est.** 2h

### T-107 · Editor support for `kind: "deck"` (slide-aware navigation)
- **Inputs:** T-103, T-74
- **Outputs:** updates to `src/editor/Editor.tsx` with slide-by-slide navigation
- **Acceptance:** When editing a deck, the editor shows slides as a vertical strip with a current-slide focus area; consultant can jump between slides.
- **est.** 4h

**M6 acceptance gate:** same DocModel renders as a deck; layouts are a closed set; no free positioning; deck reuses schema, editor, comment system unchanged.

---

## Phase 7 — Deployment & Release

### T-108 · Set up code signing (macOS, Windows)
- **Outputs:** signing certs in CI secrets; signed build outputs
- **Acceptance:** `npm run tauri build` produces a signed `.dmg` (macOS) and `.msi` (Windows). Linux uses unsigned AppImage.
- **est.** 6h (mostly cert procurement bureaucracy)

### T-109 · Set up Tauri updater
- **Outputs:** updater config in `tauri.conf.json`; release feed
- **Acceptance:** App checks for updates on launch; updates from a manually-hosted JSON feed.
- **est.** 4h

### T-110 · Build release pipeline (3 OSes)
- **Outputs:** GitHub Actions workflow that builds + signs + publishes installers on tag push
- **Acceptance:** Pushing a `v1.0.0` tag produces 3 installers in the release artifacts.
- **est.** 6h

### T-111 · Write the privacy notice (install-time disclosure)
- **Inputs:** D-32, D-34
- **Outputs:** `docs/privacy-notice.md` + install-flow integration (T-73)
- **Acceptance:** Notice is shown at install; covers what cost data is stored, where, why, and how to view/wipe it. Notice text in EN and FR (D-28).
- **est.** 2h

### T-112 · Write the setup runbook
- **Inputs:** SETUP_PIPELINE.md §10
- **Outputs:** `docs/setup-runbook.md`
- **Acceptance:** A devops admin can follow the runbook to set up a new consultancy install in < 1 hour (excluding LLM-call time).
- **est.** 3h

---

## Summary

| Phase | Milestone | Tasks | Est. hours | Notes |
|---|---|---|---|---|
| 0 | M0 | T-01 — T-09 | 9.5 | Scaffold |
| 1A | M1 (core schema) | T-10 — T-19 | 14.5 | |
| 1B | M1 (brand consumption) | T-20 — T-22 | 5 | |
| 1C | M1 (15 blocks) | T-23 — T-40 | ~110 | The biggest chunk |
| 1D | M1 (setup pipeline + watchdog) | T-41 — T-49 incl. T-46b | 50 | +watchdog per ADR-0001 |
| 2 | M2 (renderer/PDF) | T-50 — T-59 | 32 | |
| 3 | M3 (LLM interface) | T-60 — T-73 | 50 | |
| 4 | M4 (editor + perf gate) | T-74 — T-89 incl. T-89b/c/d | ~74 | +perf harness per D-39 |
| 5 | M5 (comments) | T-90 — T-102 | 52 | |
| 6 | M6 (deck) | T-103 — T-107 | 38 | v1.1 |
| 7 | Deployment | T-108 — T-112 | 21 | |
| | | | **~462h** | ≈ 12 weeks full-time for a strong dev, or ~6 months at half-time |

**Realistic v1 (excluding M6 deck path):** ~424 hours ≈ 10.5–11 weeks full-time. The ~12h additions from O-08 resolution (watchdog + perf harness) pay for themselves the first time a perf regression is caught in CI rather than in pilot.

These numbers match the architecture memo's §11 estimate of "6–12 months commitment" — the lower bound is achievable with a strong developer focused full-time; the upper bound includes M6 and a real-world overhead (review, debug, refactor, meetings).

---

## How to use this list

- **Daily:** pick the next task with no unmet dependencies. Update its status. PR title format: `T-NN: <subject>`.
- **Weekly:** review velocity vs estimate. Adjust scope if running > 1.5× over.
- **Per phase:** confirm the BUILD_BRIEF acceptance gate before starting the next phase.
- **When blocked:** if a task can't proceed, note the blocker in this file and pick the next unblocked task.

This is a backlog, not a contract. Reorder freely as you learn — but always against the BUILD_BRIEF acceptance gates, which are the real targets.
