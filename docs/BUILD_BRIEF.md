# Build Brief — Acme jayson-docs (v1, four-skill portable pack — BYO LLM)

**For:** the implementing developer / Claude Code
**Companion to:** `docs/ARCHITECTURE.md`, `docs/SLIDE_LAYOUT_LIBRARY.md`, `docs/DECISIONS_LOG.md`
**Date:** 2026-06-04 (updated for D11 — Cowork-as-LLM)

---

## How to use this brief

`docs/ARCHITECTURE.md` explains why. This brief is what to do: stack, repo, milestones, acceptance criteria. Read the architecture first; build to this brief. When the two disagree, the architecture's §2 principle wins — stop and ask.

Work milestone by milestone. Do not start a milestone until the previous one's acceptance criteria all pass.

---

## 0. Guardrails (non-negotiable)

- **Greenfield.** No code imported from prior prototypes.
- **No LLM call in this codebase.** Claude-in-Cowork is the LLM via the user's session (see `docs/DECISIONS_LOG.md` D11). The CLI accepts a *fill-plan JSON*; it does not generate one. No `@anthropic-ai/sdk`, no API key, no environment variables for LLM auth.
- **Open-source only.** Use only the components in `package.json` §2. Any other runtime dependency requires explicit approval.
- **No DocModel-as-canonical layer.** The master `.pptx` / `.docx` is the source of brand; the fill-plan JSON is the source of content per-deliverable.
- **Do not build:**
  - a WYSIWYG editor (the editor is PowerPoint / Word),
  - an LLM client (Cowork is the LLM),
  - a DOCX / PPTX parser (read-only loading by `pptx-automizer` / `docx` doesn't count),
  - any HTML or PDF renderer,
  - any chart re-implementation in code (Office-native charts only, via the §2 libraries),
  - free-canvas slide composition.
- **Demo Office files are setup-time input only.** The master templates are read by the libraries at fill time; nothing else.
- **When uncertain, stop and ask.** No invented brand values, slot names, chart types, or layouts.

---

## 1. Repository layout

```
jayson-docs/
  package.json
  tsconfig.json
  README.md
  AGENTS.md
  CHART_CATALOGUE.md
  ERROR_HANDLING.md
  /docs/                              # design docs (this file lives here)
  /templates/                         # master .pptx and .docx files (you drop them here)
  /skills/                            # 4 skills (markdown playbooks; see skills/README.md)
    commercial-proposal-pptx/SKILL.md
    commercial-proposal-docx/SKILL.md
    report-pptx/SKILL.md
    report-docx/SKILL.md
    manifest.json
    README.md
  /src/
    /schema/                          # Zod schemas; one closed library per layout & per chart kind
      brand.ts
      chart.ts
      slide.ts
      index.ts
      /layouts/                       # one file per approved layout
    /brand/brand.yaml                 # canonical brand tokens (DECISIONS_LOG.md D2-2)
    /pipeline/                        # PPTX template-fill (M2/M3)
      load-master.ts
      fill-slide.ts
      build-dynamic-chart.ts
      save-output.ts
      /docx/                          # DOCX template-fill (M4)
        load-template.ts
        fill-document.ts
        save-output.ts
    /cli/generate.ts                  # `fill` subcommand; dispatch on file extension
    /llm/README.md                    # intentionally empty
  /fixtures/                          # sample brief, sample fill-plan, invalid cases
  /scripts/validate.ts                # Zod schema-check on fixtures
  /tests/
```

---

## 2. Stack & setup

Runtime:

- **Node** 20.11+ with **TypeScript**.
- **pptx-automizer** — open master, fill named shapes (PPTX).
- **pptxgenjs** — from-scratch chart objects (PPTX).
- **docx** (dolanmiu) — DOCX `patchDocument` template-fill + native charts.
- **zod** — schema definition + fill-plan validation.
- **yaml** — parse `brand.yaml`.
- **commander** — CLI argument parsing.

Dev: vitest, eslint, prettier, tsx.

npm scripts: `build`, `test`, `lint`, `format`, `validate`, `fill`.

---

## 3. Milestones

### M0 — Project scaffold
- [ ] Verify `npm install` succeeds; `npm run build`, `npm run lint`, `npm run test`, `npm run validate` all pass with the scaffolded files.
- **Acceptance:** clean install on a fresh machine; CI / lint green; the fixture-validation script reports every fixture as expected.

### M1 — Schema extension
- [ ] Author the five remaining slide-layout schemas from `docs/SLIDE_LAYOUT_LIBRARY.md` following the pattern in `src/schema/layouts/kpi-row-chart.ts`.
- [ ] Author the DOCX section schemas (TBD layouts — design alongside the master templates).
- [ ] Wire all layouts into the discriminated union in `src/schema/slide.ts` (and equivalent for DOCX sections).
- [ ] Extend fixtures to cover every layout / section.
- **Acceptance:** every layout / section has at least one valid fixture and one invalid fixture, all detected correctly by `npm run validate`.

### M2 — PPTX pipeline (text & images)
- [ ] `load-master.ts`, `fill-slide.ts`, `save-output.ts` implemented.
- [ ] Wired through the CLI `fill --template ...pptx --plan ... --out ...pptx` path.
- [ ] No LLM call; the CLI reads the fill-plan from disk.
- **Acceptance:** a fixture fill-plan + the master `.pptx` produces an output `.pptx` opening cleanly in PowerPoint, with text and image slots correctly filled and brand visually identical to the master.

### M3 — PPTX charts
- [ ] Same-type chart data swap via pptx-automizer.
- [ ] Variable-type chart construction via PptxGenJS, injected via pptx-automizer.
- [ ] All charts are **native PowerPoint charts** (editable, not images).
- **Acceptance:** a fixture fill-plan containing same-type and variable-type charts produces native editable charts in the output `.pptx`.

### M4 — DOCX pipeline
- [ ] `src/pipeline/docx/load-template.ts`, `fill-document.ts`, `save-output.ts` implemented.
- [ ] CLI `fill --template ...docx --plan ... --out ...docx` path.
- [ ] Charts use dolanmiu/docx's native Chart classes — no images.
- **Acceptance:** a fixture fill-plan + the master `.docx` produces an output `.docx` opening cleanly in Word, with placeholders filled, native editable charts, and brand visually identical to the master.

### M5 — Skills pack (portable; Cowork plugin optional)
- [ ] Each of the four SKILL.md files under `skills/` references the right master template, the right schema, and the right CLI invocation, and is followable by any agentic LLM (BYO LLM, D15).
- [ ] Smoke-test the pack with at least two LLMs (e.g. Claude Code + Cowork): brief → fill-plan → CLI → file. Confirm it also works when the **human** runs the CLI on the LLM's fill-plan.
- [ ] *(Optional)* Package as a Cowork plugin — verify the manifest + SKILL.md formats with the `cowork-plugin-management:create-cowork-plugin` skill.
- **Acceptance:** all four skills work end-to-end driven by a BYO LLM, producing the expected output file from a representative brief.

---

## 4. Per-component "done means"

| Component | Done when |
|---|---|
| Master templates | Real Acme files in `templates/`; named shapes / placeholders match the schemas |
| Schema | Closed `layoutId` enum; per-layout slot enum; density caps enforced; valid + invalid fixtures pass `validate` |
| PPTX pipeline | Brand-identical output; named-shape fills correct; native editable charts (same-type and variable-type) |
| DOCX pipeline | Brand-identical output; placeholder fills correct; native editable charts |
| CLI | Dispatches on extension; rejects mismatched `--template` / `--out`; rejects invalid fill-plans with clear errors |
| Skills | Each SKILL.md instructs Claude correctly; plugin installs; end-to-end smoke test passes in Cowork |

---

## 5. Testing requirements

- **Mandatory automated:**
  - Zod validation on valid + invalid fixtures (already scaffolded; extend per M1).
  - Pipeline integration per format: a fixture fill-plan produces a file with the expected named shapes / placeholders filled.
  - Chart-rendering correctness: chart type, series, and data values survive the round-trip.
- **Nice-to-have:** visual regression via headless LibreOffice rendering + image diff, per layout.
- Keep `/fixtures` exhaustive — at least one valid and one invalid fixture per layout / section.

---

## 6. Definition of done — v1

- M0–M5 acceptance criteria all pass.
- Each of the four skills produces a final deliverable in its target format, brand-correct, with native editable charts, from a representative brief in a Cowork session.
- No `@anthropic-ai/sdk` dependency; no API key handling; no LLM call from this codebase.
- `npm run build`, `npm run lint`, `npm run test`, `npm run validate` all green.
- The repo is small, dependencies are exactly those in `package.json`, and docs are accurate.

Then stop. v2 (more layouts, MinerU upstream ingestion, standalone CLI with API key for batch / scheduled runs) waits for explicit go-ahead.
