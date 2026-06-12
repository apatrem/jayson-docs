# T-212: Box-diagram archetype contracts — schemas + catalogue + fixtures (D27)

<!-- Output of the Phase 6 design grill (D27). STACK per archetype family. -->

## Objective

For each **box-diagram** archetype authored in T-211 — 2×2 matrix (+ optional 9-box), process 3/4/5, KPI 3/4/5, big-number, pyramid 3/4, funnel 3/4/5, feature-grid 3/4/5, roadmap 3/4/5, quote — add its Zod layout schema, catalogue entry (tier / usage / regions / per-cell fill-bands), and a valid + invalid fixture. Sub-slotted cells fill through the existing text/content handlers; each cell honours its D26 band. **Stack per family.**

## Acceptance criteria (must be machine-checkable)

- [ ] Each new `layoutId` validates + fills end-to-end → `tests/` (a Phase-6 acceptance block): fill `fixtures/layouts/valid-<layout>.json`, assert cell values; `fixtures/invalid/<layout>-*.json` rejected with exit 2.
- [ ] Catalogue carries each layout's `regions` + per-cell fill-bands; the drift test stays green.
- [ ] Cardinality per D27: linear archetypes shipped at 3/4/5; pyramid 3/4; matrix fixed-4; big-number/quote singular.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/schema/layouts/` — new per-`layoutId` schemas.
- `skills/report-pptx/layout-catalogue.json`; `fixtures/layouts/valid-*.json`; `fixtures/invalid/*`.
- `tests/`.

## Out of scope

- Table archetypes (→ T-213); master design (→ T-211).

## Risks / do-not-touch

- Only catalogue `layoutId`s are valid; objects are `.strict()`; chart kinds are unchanged (D21). Do not touch the existing 26 layouts or `layout-spec.json` by hand (§5).

## Meta

- mode: medium
- depends-on: T-211, T-201
- parallel-safe: yes # across families once T-211 lands; stack per family
- size budget: < 300 changed lines per family sub-PR
