# Build Brief — Acme jayson-docs (v1, four-skill portable pack — BYO LLM)

**For:** the implementing developer / Claude Code
**Companion to:** `docs/ARCHITECTURE.md`, `docs/SLIDE_LAYOUT_LIBRARY.md`, `docs/DECISIONS_LOG.md`
**Date:** 2026-06-05 (updated through D19 — BYO-LLM delivery, four-skill portable pack)

---

## How to use this brief

`docs/ARCHITECTURE.md` explains why. This brief is what to do: stack, repo, milestones, acceptance criteria. Read the architecture first; build to this brief. When the two disagree, the architecture's §2 principle wins — stop and ask.

Work milestone by milestone. Do not start a milestone until the previous one's acceptance criteria all pass.

---

## 0. Guardrails (non-negotiable)

- **Greenfield.** No code imported from prior prototypes.
- **No LLM call in this codebase.** The LLM is the user's own agentic LLM (BYO LLM, D15; Cowork is one option) via their session — no LLM call lives here (D11). The CLI accepts a *fill-plan JSON*; it does not generate one. No `@anthropic-ai/sdk`, no API key, no environment variables for LLM auth.
- **Open-source only.** Use only the components in `package.json` §2. Any other runtime dependency requires explicit approval.
- **No DocModel-as-canonical layer.** The master `.pptx` / `.docx` is the source of brand; the fill-plan JSON is the source of content per-deliverable.
- **Do not build:**
  - a WYSIWYG editor (the editor is PowerPoint / Word),
  - an LLM client (the LLM is the user's own — BYO LLM),
  - a DOCX / PPTX parser (read-only loading by `pptx-automizer` / `docx` doesn't count),
  - any HTML or PDF renderer,
  - any chart re-implementation in code (Office-native charts only, via the §2 libraries),
  - free-canvas slide composition.
- **Demo Office files are setup-time input only.** The master templates are read by the libraries at fill time; nothing else.
- **When uncertain, stop and ask.** No invented brand values, slot names, chart types, or layouts.

---

## 0.5 Scope fence — what v1 *is* (D20)

**v1 = one PPTX walking skeleton, end-to-end:** `templates/report.master.pptx` + the **`kpi-row-chart`** layout, filled mechanically (BYO LLM → fill-plan JSON → CLI → native `.pptx`). Charts are `pptx-automizer` **data-swaps into pre-authored master charts** (D21); a chart slot's type is fixed by the layout, not chosen by the LLM.

**Explicitly out of v1 — do not build under this brief** (designed, deferred): the other five PPTX layouts; the entire **DOCX** pipeline; chart kinds the master does not pre-author; **Setup / Ingestion** (D13) and firm-context handling; the at-scale **Layout catalogue** (D16) as a generated artifact; layout **sharing** (D17); the **skill creator** (D18); **signed-binary packaging / distribution** (D14). The other three skills ship as markdown playbooks but are not implemented in v1.

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
  /fixtures/                          # sample fill-plan, invalid cases
  /scripts/validate.ts                # Zod schema-check on fixtures
  /tests/
```

---

## 2. Stack & setup

Runtime:

- **Node** 22+ with **TypeScript** (`.nvmrc` pins 24; `package.json` engines require ≥22).
- **pptx-automizer** — open master, fill named shapes (PPTX).
- **pptxgenjs** — from-scratch chart objects (PPTX).
- **docx** (dolanmiu) — DOCX `patchDocument` template-fill + native charts.
- **zod** — schema definition + fill-plan validation.
- **yaml** — parse `brand.yaml`.
- **commander** — CLI argument parsing.

Dev: vitest, eslint, prettier, tsx.

npm scripts: `build`, `test`, `lint`, `format`, `validate`, `fill`.

---

## 3. Milestones — v1 is a vertical slice (D20)

Build **one layout end-to-end** before widening. Do not start a step until the previous one's acceptance criteria pass.

### M0 — Project scaffold ✅
- Verify `npm install`, `npm run build`, `lint`, `test`, `validate` all pass with the scaffolded files.
- **Acceptance:** clean install on a fresh machine; the fixture-validation script reports every fixture as expected. *(Done.)*

### M1 — Strict schema + `kpi-row-chart` (no master needed)
- [ ] Make the fill-plan schema **strict** at the LLM boundary: `.strict()` on section/slide/block/chart objects; `superRefine` so each chart `datasetRef` resolves in `datasets`; pie/doughnut rows ≤ 8; a chart's `kind` must equal its layout slot's pinned literal (D21 corollary).
- [ ] Implement `src/brand/load.ts` (parse + Zod-validate `brand.yaml`).
- [ ] Add invalid fixtures + tests for each new rule (unknown-key, bad `datasetRef`, pie>8, kind-mismatch). TDD.
- **Acceptance:** `npm run validate` / `test` cover every rule; **no master required** for this step.

### M2 — `report.master.pptx` + text/image/kpi fill
- [ ] Obtain `templates/report.master.pptx` with the `kpi-row-chart` slide + named shapes (real, or `PLACEHOLDER-` per §0.5 / AGENTS §4).
- [ ] `load-master.ts`, `fill-slide.ts` (title / kpi-strip / narrative / image), `save-output.ts`; wire the CLI `fill --template ...pptx` path.
- **Acceptance:** a fixture fill-plan + the master produces a `.pptx` opening cleanly in PowerPoint, brand-identical, with text/kpi/image slots filled.

### M3 — the `kpi-row-chart` chart (automizer data-swap)
- [ ] `pptx-automizer` swaps the dataset into the chart **pre-authored in the master** for that slot (D21). No PptxGenJS build in v1.
- **Acceptance:** the chart in the output `.pptx` is a native, editable PowerPoint chart carrying the fill-plan's data.

### M4 — `report-pptx` skill end-to-end
- [ ] The `report-pptx` SKILL drives a BYO LLM: brief → schema-valid fill-plan → CLI → file; also works when a **human** runs the CLI on the fill-plan.
- **Acceptance:** end-to-end on `kpi-row-chart`, driven by ≥1 BYO LLM, producing the expected `.pptx`.

**Then widen (post-skeleton):** add layouts one at a time (each = schema + valid/invalid fixtures + a master slide). **DOCX, the other three skills, and everything in §0.5 are post-v1.**

---

## 4. Per-component "done means"

| Component | Done when |
|---|---|
| Master templates | Real Acme files in `templates/`; named shapes / placeholders match the schemas |
| Schema | Closed `layoutId` enum; per-layout slot enum; density caps enforced; valid + invalid fixtures pass `validate` |
| PPTX pipeline | Brand-identical output; named-shape fills correct; native editable charts (same-type and variable-type) |
| DOCX pipeline | Brand-identical output; placeholder fills correct; native editable charts |
| CLI | Dispatches on extension; rejects mismatched `--template` / `--out`; rejects invalid fill-plans with clear errors |
| Skills | Each SKILL.md instructs the LLM correctly; plugin installs; end-to-end smoke test passes driven by a BYO LLM |

---

## 5. Testing requirements

- **Mandatory automated:**
  - Zod validation on valid + invalid fixtures (already scaffolded; extend per M1).
  - Pipeline integration per format: a fixture fill-plan produces a file with the expected named shapes / placeholders filled.
  - Chart-rendering correctness: chart type, series, and data values survive the round-trip.
- **Nice-to-have:** visual regression via headless LibreOffice rendering + image diff, per layout.
- Keep `/fixtures` exhaustive — at least one valid and one invalid fixture per layout / section.

---

## 6. Definition of done — v1 (the report-pptx skeleton)

- M0–M4 acceptance criteria all pass.
- The **`report-pptx`** skill produces a final `.pptx` for the `kpi-row-chart` layout — brand-correct, with a native editable chart — from a representative brief, driven by a **BYO LLM** (Cowork is one option; also verify a human-run fill-plan).
- The fill-plan schema is **strict** and cross-validating (M1).
- No `@anthropic-ai/sdk` dependency; no API key handling; no LLM call from this codebase.
- `npm run build`, `npm run lint`, `npm run test`, `npm run validate` all green.
- The repo is small, dependencies are exactly those in `package.json`, and docs are accurate.

Then stop. Everything in §0.5 (more layouts, DOCX, Setup, sharing, skill creator, signed binary, MinerU upstream) waits for explicit go-ahead.
