# jayson-docs — Repository Review

**Date:** 2026-06-05  
**Scope:** Full-repo assessment — architecture, documentation alignment, autonomous-implementation readiness.

---

## Executive summary

This is a **well-architected, documentation-heavy scaffold** for a small template-fill app plus a portable skills pack. The design is unusually clear for autonomous implementation. **M0 is done** (`npm install`, `build`, `lint`, `test`, `validate` all pass). **Implementation is early**: one of six slide layouts is schema-complete, the CLI validates fill-plans but does not fill templates, and all pipeline modules are stubs.

---

## 1. What the repo is

A **BYO-LLM consulting deliverable generator**:

| Layer | Role |
|--------|------|
| **Skills** (`skills/`) | Markdown playbooks — gather brief, emit fill-plan JSON, invoke CLI |
| **Schema** (`src/schema/`) | Zod contracts — closed layouts, density caps, chart kinds |
| **CLI** (`src/cli/generate.ts`) | Pure mechanical fill — no LLM |
| **Pipeline** (`src/pipeline/`) | `pptx-automizer` + `pptxgenjs` (PPTX), `docx` (DOCX) |
| **Masters** (`templates/`) | Brand + geometry — **not in repo yet** |

The **one principle** (stated consistently in `AGENTS.md`, `CONTEXT.md`, `ARCHITECTURE.md`): *Cowork/LLM drafts, templates anchor, Office edits.* Output variability is bounded by a closed layout library and named slots, not by LLM layout reasoning.

---

## 2. Architecture assessment

### What works well

**Separation of concerns is load-bearing and correct.** The hardest problem — brand-consistent Office output — is pushed to hand-designed masters and deterministic fill. The LLM only does what it is good at: semantic content, layout *selection* from a closed enum, and slot filling under Zod caps.

**Decision discipline is strong.** `DECISIONS_LOG.md` records not just choices but rejections (TipTap editor, docxtemplater, flexgrid, in-tree LLM). That materially reduces the risk an implementing agent re-litigates settled questions.

**The content model is coherent** after the recent cleanup (`CONTEXT.md` documents this explicitly):

- Fill-plan is **non-canonical** draft input; Office file is the deliverable
- Two-level body: `Section ⊃ Slide` (deck) or `Section ⊃ blocks` (document)
- Pipeline **never paginates** — overflow is an LLM authoring problem (D12)

**Stack choices are pragmatic for consulting workflows:**

- `pptx-automizer` for named-shape fill + same-type chart data swap
- `pptxgenjs` for variable chart types (e.g. waterfall)
- `dolanmiu/docx` for DOCX + native charts
- All MIT, no paid chart modules

**Walking-skeleton strategy is sensible:** `report-pptx` first on `report.master.pptx`, then generalize. That matches deck-heavy usage and gates the riskiest work (PPTX + charts) early.

### Trade-offs consciously accepted

| Trade-off | Verdict |
|-----------|---------|
| Expressiveness capped by layout library (~6 seeds in v1, ~50–100 long-term via D16) | Correct for consistency guarantee |
| No round-trip from edited Office back to fill-plan | Matches real consulting workflow |
| Brand fused into master in v1 (not swappable theme) | Simpler; deferred split is documented |
| `pptx-automizer` pinned at `~0.8.1` (only 0.x dep) | Necessary but fragile — noted in `OVERVIEW.md` |
| Signed standalone binary (D14) | Right for confidentiality; **not started**, external dependency |

### Architectural tensions to resolve (not blockers for M1–M4, but confusing)

1. **D7 vs Setup pipeline Stage 1.** D7 says "no runtime Office parsing." `SETUP_PIPELINE.md` Stage 1 describes OOXML unzip/parsing for Setup. That is probably *setup-time-only*, but it is not explicitly fenced from v1 build milestones. An agent could wander into Setup tooling.

2. **D16 Layout catalogue vs v1 scope.** D16–D18 (catalogue, layout sharing, skill creator) are richly specified but **out of `BUILD_BRIEF.md` milestones M0–M5**. Skills already tell the LLM to read a "Layout catalogue" that **does not exist as a file** — only `SLIDE_LAYOUT_LIBRARY.md` and per-layout Zod schemas.

3. **`brand.yaml` vs "brand is the template."** D2-2 makes `brand.yaml` canonical for tokens used at fill time (chart colours, etc.), while v1 also says brand is fused in the master. That dual source is acknowledged as deferred theme-split; the agent needs a clear rule for **which wins when chart styling in the master disagrees with YAML**.

---

## 3. Documentation alignment

### Strong alignment (core chain)

These files tell a consistent story:

- `OVERVIEW.md` → `CONTEXT.md` → `ARCHITECTURE.md` → `BUILD_BRIEF.md` → `AGENTS.md`
- `SLIDE_LAYOUT_LIBRARY.md` updated for **D19** (master-canonical geometry, grid illustrative only)
- `ERROR_HANDLING.md` aligned to fill-plan + D11 (no env/API key)
- Skills renamed `deck-*` → `report-*`; fixtures match two-level model

`AGENTS.md` is an excellent autonomous-agent handoff: read order, hard rules, open inputs, milestone discipline.

### Stale or inconsistent pockets

| Issue | Where | Impact |
|-------|--------|--------|
| **Cowork-as-only-delivery language** | `README.md` L3–7, L49; `ARCHITECTURE.md` §7 L131; `commercial-proposal-pptx/SKILL.md` L20–21; `.env.example`; `skills/manifest.json` description | Contradicts **D15 BYO LLM**. Agent may assume Cowork-only. |
| **`CHART_CATALOGUE.md` says `data` block** | L29, L106 | Schema uses **`datasets`** (see `fixtures/valid-fill-plan.json`). Skills/commercial-proposal-pptx use `datasets` correctly. |
| **`brand.yaml` references `src/brand/load.ts`** | Comment in YAML | **File does not exist** — only `brand.ts` (Zod schema). |
| **`.nvmrc` referenced, missing** | `BUILD_BRIEF.md` §2, `OVERVIEW.md` §10 | Minor; `engines.node >= 22` in `package.json` is sufficient. |
| **`OVERVIEW.md` doc map says "D1–D18"** | §13 L144 | Index includes D19; header inconsistent. |
| **`DECISIONS_LOG.md` header date** | L3 | Says "updated for D11"; body has D19. |
| **Skills "Read first" → Layout catalogue** | `SKILL_AUTHORING.md`, skills | Catalogue file **not scaffolded**; only slide layout spec exists. |
| **No CI workflow** | — | `BUILD_BRIEF.md` M0 mentions "CI / lint green" but no `.github/workflows`. |
| **`datasetRef` not validated against `datasets` map** | `src/schema/chart.ts` | Invalid refs pass Zod today; only caught at pipeline runtime (if implemented). |

### Code ↔ docs alignment

| Doc claim | Code reality |
|-----------|--------------|
| No LLM in codebase | ✅ `src/llm/*.ts` are empty stubs |
| CLI `fill` dispatches on extension | ✅ Validates; exits 2 with "pending M2/M3/M4" |
| One layout schema complete | ✅ Only `kpi-row-chart` in `slide.ts` |
| Four skills scaffolded | ✅ All four `SKILL.md` + `manifest.json` |
| Masters in `templates/` | ❌ Empty (expected) |
| Bundled `./jayson-docs` binary | ❌ Not built; dev uses `npm run fill` / `tsx` |
| `npm run build` produces output | ⚠️ `tsc --noEmit` only — no `dist/`, no `bin` in `package.json` |

---

## 4. Current implementation state

```
M0  Scaffold + quality gates     ✅ PASS
M1  Remaining layout schemas    ⬜ 1/6 layouts; no DOCX section fixtures
M2  PPTX text/images            ⬜ stubs throw "M2 not implemented"
M3  PPTX charts                  ⬜ stub in build-dynamic-chart.ts
M4  DOCX pipeline               ⬜ stubs
M5  Skills E2E smoke test       ⬜ blocked by M2–M4 + masters
```

**What exists and is solid:**

- `fillPlanSchema` — kind-discriminated, sections model
- `kpi-row-chart` layout — density caps, narrative union, chart block
- Chart kinds + dataset shape in Zod
- 7 schema tests + 5 fixture validations
- CLI skeleton with extension matching and validation exit codes

**What is intentionally deferred (correct for scaffold):**

- Pipeline implementation
- Remaining five PPTX layout schemas
- DOCX block-type expansion (table, callout, kpi-cards per `block.ts` comment)
- Setup skill, skill creator, layout packages, signed binary

---

## 5. What is needed before an AI agent starts autonomous implementation

### A. External inputs (true blockers)

These cannot be invented without breaking the consistency guarantee:

1. **`templates/report.master.pptx`** — first walking skeleton per `DECISIONS_LOG.md` and `OVERVIEW.md` §12. Must include at least the `kpi-row-chart` slide with shapes named per `SLIDE_LAYOUT_LIBRARY.md` (`slot.title`, `slot.chart`, etc.).

2. **Shape inventory ↔ schema lock-step.** For each layout in v1, named shapes in the master must match Zod slot names exactly. A simple manifest (layoutId → slide index → shape list) would save the agent hours of trial-and-error.

3. **DOCX master spec** — `BUILD_BRIEF.md` M1 says "DOCX section schemas TBD — design alongside master templates." An agent cannot complete M4 without placeholder names in `report.master.docx`.

4. **(Later, not M0–M5)** Code signing certs for D14 binary — document as post-v1 if M5 accepts `npx`/dev invocation.

### B. Doc fixes before handoff (1–2 hours, high leverage)

An agent *can* proceed without these, but will hit confusion:

1. **Reconcile Cowork-only wording** in `README.md`, `ARCHITECTURE.md` §7, skills, `.env.example`, `manifest.json` → consistent **BYO LLM / D15**.

2. **Fix `CHART_CATALOGUE.md`**: `data` → `datasets`.

3. **Add v1-scope fence** to `AGENTS.md` or `BUILD_BRIEF.md`: explicitly *out of v1* — Setup pipeline, D16 catalogue at scale, D17–D18 sharing, skill creator, signed binary packaging.

4. **Scaffold a minimal `LAYOUT_CATALOGUE.json`** (or `.md`) for the six seed layouts with `tier`, `usage`, `regions`, `caps` — or change skills to say "read `SLIDE_LAYOUT_LIBRARY.md`" until catalogue exists.

5. **Implement or remove `src/brand/load.ts`** reference — agent will need it for M3 chart colours.

6. **Add `.nvmrc` with `24`** or remove references.

7. **Optional:** cross-validate `datasetRef` keys exist in `fillPlan.datasets` at schema level.

### C. Agent execution prerequisites (in-repo, ordered)

Per `BUILD_BRIEF.md`, the agent should:

| Step | Work |
|------|------|
| **M1** | Five remaining layout schemas from `SLIDE_LAYOUT_LIBRARY.md`; wire into `slide.ts`; valid + invalid fixtures each |
| **M1b** | DOCX block schema expansion + document fixtures (once master placeholders are known) |
| **M2** | `load-master.ts`, `fill-slide.ts`, `save-output.ts` + CLI wiring |
| **M3** | `build-dynamic-chart.ts` — same-type swap + PptxGenJS inject |
| **M4** | DOCX pipeline |
| **M5** | Skills smoke test with ≥2 LLMs |

**Placeholder strategy** (per `AGENTS.md` §4): agent may author `PLACEHOLDER-report.master.pptx` for development, but **acceptance requires real Acme master**.

### D. Agent guardrails already in place (keep them)

- `AGENTS.md` read order and hard rules
- Milestone gating (do not skip M1 before M2)
- No new dependencies without approval
- No auto-fix of validation failures
- `ERROR_HANDLING.md` exit code contract

### E. Recommended additions for safer autonomy

| Addition | Why |
|----------|-----|
| **CI workflow** (lint + test + validate on push) | M0 acceptance mentions CI; prevents regressions |
| **`package.json` `bin` field** + build to `dist/` | Aligns with skills' `./jayson-docs` invocation |
| **Integration test** that runs `fill` on placeholder master | Proves M2+ mechanically |
| **`templates/MANIFEST.json`** — layoutId, slide index, expected shape names | Enforces `shapes ≡ slots` without manual PowerPoint inspection |
| **Explicit "first PR scope"** in `BUILD_BRIEF.md` | report-pptx + kpi-row-chart only — prevents agent building all four skills' layouts before first E2E |

---

## 6. Verdict

| Dimension | Assessment |
|-----------|------------|
| **Architecture** | Strong. Template-fill + closed library is the right fit for consulting Office workflows. Decisions are well-reasoned and logged. |
| **Doc quality** | Exceptional for a greenfield scaffold. Minor staleness from D11→D15 evolution; one factual bug (`data` vs `datasets`). |
| **Doc ↔ code alignment** | Good for M0 contracts; pipeline intentionally unimplemented. Catalogue/binary/masters documented but not present. |
| **Autonomous-agent readiness** | **~75% ready.** Agent can start M1 immediately. **M2+ is blocked** without `report.master.pptx` (or a documented placeholder contract). Clarify v1 scope fence so agent does not implement Setup/D16–D18. |

### Minimum before "go autonomous" on implementation

1. Deliver or spec `report.master.pptx` (at least `kpi-row-chart` slide + named shapes).
2. Patch the doc inconsistencies above (especially BYO LLM wording + chart catalogue + layout catalogue pointer).
3. Add a v1 scope boundary so the agent stays on M0–M5 and does not build the Setup/multi-firm platform.

---

## 7. Related documents

| Topic | File |
|-------|------|
| Agent handoff | `AGENTS.md` |
| Build milestones | `docs/BUILD_BRIEF.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Decisions | `docs/DECISIONS_LOG.md` |
| Glossary | `CONTEXT.md` |
| Overview | `OVERVIEW.md` |
