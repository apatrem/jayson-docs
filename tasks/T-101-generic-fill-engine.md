# T-101: Generic fill engine + first real layout end-to-end

<!-- Output of Phase 2 (/agentic-workflow:plan). One unit of work, small enough to review. -->
<!-- Phase 5 — wire the 26-layout master into the fill pipeline (see report-pptx SKILL "Phase 5"). -->

## Objective
Replace the `kpi-row-chart`-only dispatch in `fillSlide` with a generic, **layout-spec-driven** slot-fill path, so the 26 real layouts (schema-validated since Phase 3) become fillable against `templates/report.master.pptx`. Land the foundation by making **one simple text layout (`section`) fill end-to-end**, proving the generic plumbing. This task defines the engine seam the other Phase-5 tasks build on.

## Acceptance criteria (must be machine-checkable)
- [ ] `fillSlide` fills a real layout by looking up `sourceSlideIndex` + `slots` from `src/setup/layout-spec.json` (not a hardcoded per-layout map), copying that master slide and setting its text slot(s) from the slide values → un-skip + pass `tests/phase5-acceptance.test.ts` › **T-101** (fill `fixtures/layouts/valid-section.json`, assert `slot.section-title` == the fixture value).
- [ ] **kpi-row-chart fill is unchanged** — existing `tests/pipeline.test.ts` (M2/M3/M4) stays green.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved
- `src/pipeline/fill-slide.ts` — generalize dispatch; derive slide index from `layout-spec.json`.
- `src/pipeline/` — likely a new `fill-real-layout.ts` + a slot-fill helper that maps a slot's `regionKind`/value → the right `modify.*`.
- `src/setup/layout-spec.json` — **read-only** input (the master↔slot contract).
- `tests/phase5-acceptance.test.ts` — un-skip the T-101 block.

## Out of scope
- All non-section text slots beyond what `section` needs (→ T-102), content blocks (→ T-103), chart slots (→ T-104), the skill (→ T-105).

## Risks / do-not-touch
- **Do NOT change** the Zod layout schemas (`src/schema/**`) or `src/setup/layout-spec.json` — Phase-5 *consumes* these contracts, never edits them.
- Do NOT regress the v1 `kpi-row-chart` path. Do NOT touch `src/brand/brand.yaml` or the master templates.

## Meta
- mode: medium          # low | medium | hard — the core pipeline seam; defines the engine API T-102/103/104 depend on (ADR-0004)
- risk: low             # acceptance is a runnable fill test
- depends-on: —
- parallel-safe: no     # foundation — must land before T-102/T-103/T-104
- size budget: < 300 changed lines
