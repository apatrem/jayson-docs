# Repository Review — 2026-06-05

## Verdict

This repository is not ready for autonomous implementation beyond a narrow PPTX feasibility spike. The architectural core is sound, but several acceptance criteria are currently impossible or undefined.

## Findings

### 1. Critical: approved dependencies cannot satisfy chart requirements

`docx@9.7.1` exposes no native chart classes, making M4 impossible as specified. `pptxgenjs@4.0.1` has no waterfall chart type, so the documented dynamic-waterfall approach is also invalid.

Relevant files:

- `docs/BUILD_BRIEF.md`
- `CHART_CATALOGUE.md`
- `src/pipeline/build-dynamic-chart.ts`

Automizer can update a pre-authored extended waterfall chart, but that is not the same as constructing a variable-type waterfall chart from scratch with PptxGenJS.

### 2. Critical: confidentiality claims are not defensible

Setup instructs a BYO LLM to ingest confidential documents while asserting nothing is uploaded. That cannot be guaranteed for hosted assistants such as Cowork, ChatGPT, Cursor, or similar tools. Trust tiers are prompt guidance, not enforced security controls.

Relevant files:

- `docs/SETUP_PIPELINE.md`
- `docs/SETUP_GUIDE.md`
- `firm-context-template/`

The docs should distinguish local deterministic app behavior from hosted LLM behavior.

### 3. High: the schema is not actually closed

Zod currently strips unknown keys by default. Invalid pie shapes, missing dataset references, arbitrary dates, and document/PPTX template mismatches can validate today.

Relevant files:

- `src/schema/chart.ts`
- `src/schema/index.ts`
- `tests/schema.test.ts`

The schema needs `.strict()` or equivalent policy everywhere the LLM boundary matters, plus cross-field validation.

### 4. High: the DOCX content interface is undefined

Fill-plans contain arbitrary sections and blocks, but the implementation sketch expects nonexistent slot names. No contract explains how flowing document content maps into fixed `.docx` template placeholders.

Relevant file:

- `src/pipeline/docx/fill-document.ts`

Before implementation, define whether DOCX uses:

- one repeating placeholder per section/block,
- a fixed skeleton of named placeholders,
- generated document content from styles,
- or a narrower v1 subset.

### 5. High: milestone order depends on missing inputs

M1 requires all layout schemas before M2, while the exact layouts, slots, DOCX sections, and four masters are explicitly TBD. The promised Layout catalogue is absent.

Relevant files:

- `AGENTS.md`
- `docs/BUILD_BRIEF.md`
- `docs/SLIDE_LAYOUT_LIBRARY.md`

Autonomous implementation should start from one real `report.master.pptx` and one known layout, then grow from a working skeleton.

### 6. High: the distributed app does not exist

`package.json` is private, has no `bin`, and `build` emits nothing. Therefore `./jayson-docs`, `npx jayson-docs`, signed binaries, and downloadable packs cannot work yet.

Relevant files:

- `package.json`
- `skills/README.md`
- `skills/*/SKILL.md`

This is fine for a scaffold, but the docs should not present the binary/package path as already available.

### 7. High: brand authority conflicts across documents

`AGENTS.md` and `src/brand/brand.yaml` say `brand.yaml` wins, while the architecture, Context, and Setup docs say the template is canonical. The referenced brand loader and logo assets are also missing.

Relevant files:

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `CONTEXT.md`
- `src/brand/brand.yaml`
- `src/schema/brand.ts`

Pick one source of truth for v1. The cleaner reading of the architecture is: the master template is canonical; `brand.yaml` is a derived, validated mirror for code paths that need tokens.

### 8. Medium: documented error guarantees are not implementable as written

The app cannot prevent an external LLM from writing its plan before validation. Logging raw plans risks disclosing client data. Direct `writeFileSync` is not atomic.

Relevant files:

- `ERROR_HANDLING.md`
- `src/pipeline/docx/save-output.ts`
- `src/pipeline/save-output.ts`

The error policy should distinguish:

- app-owned guarantees,
- skill/LLM guidance,
- and security-sensitive logging choices.

### 9. Medium: current skills predate later decisions

The skills still assume Cowork in places, invoke an absent binary, select unimplemented layouts, and do not consistently use the Standard opener or manual no-tools workflow.

Relevant files:

- `skills/commercial-proposal-pptx/SKILL.md`
- `skills/commercial-proposal-docx/SKILL.md`
- `skills/report-pptx/SKILL.md`
- `skills/report-docx/SKILL.md`
- `docs/SKILL_AUTHORING.md`

They should be treated as draft playbooks until the executable CLI and schema are real.

## Architecture Assessment

The strongest choices are:

- Office remains the editor.
- Templates own geometry and brand.
- The LLM stays outside the app.
- Fixed layouts eliminate spatial reasoning.
- Fill-plans provide a useful validation seam between untrusted model output and deterministic template fill.

The main weakness is scope expansion. The light filler is mixed with Setup automation, OOXML rewriting, firm-context ingestion, signed distribution, layout sharing, and skill creation. Those are plausible future modules, but they should not share the v1 implementation brief.

## Documentation Alignment

The docs mostly agree on the high-level principle: BYO LLM produces JSON, the app fills Office templates, no LLM call in the codebase.

The main misalignments are:

- Cowork-specific language remains in documents that later claim BYO-LLM neutrality.
- `brand.yaml` and master templates both claim canonical authority.
- v1, v1.x, v2, and deferred platform capabilities are interleaved.
- chart capabilities are documented beyond what the approved libraries support.
- skills reference layouts and binaries not yet implemented.
- Setup confidentiality claims are stronger than the actual hosted-LLM model supports.

## Required Before Autonomous Implementation

1. Freeze v1 as `report-pptx` with one real master and one proven layout.
2. Decide a verified chart capability matrix per format; remove unsupported promises.
3. Provide a Layout catalogue mapping `layoutId -> source slide, exact shapes, placeholder chart type, caps`.
4. Define the DOCX strategy, likely without native charts in v1 unless a supported library path is proven.
5. Make all external schemas strict and add cross-plan/template validation.
6. Choose the development CLI and eventual binary packaging model.
7. Resolve template-versus-YAML brand authority.
8. Correct the confidentiality model and separate future Setup work from v1.
9. Rewrite the source-of-truth docs after those decisions, then add CI and Office integration tests.

## Verification Performed

The current scaffold passes:

- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run validate`

Those gates only exercise the schema scaffold. There is no implemented PPTX/DOCX pipeline, no Office integration test, no CI, and no packaged binary.

## Supporting Artifact

Visual architecture report:

- `/tmp/architecture-review-jayson-docs-20260605.html`
