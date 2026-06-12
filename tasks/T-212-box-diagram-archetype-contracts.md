# T-212: Box-diagram archetype contracts — consume generated schemas + fixtures (D27)

<!-- Output of the Phase 6 design grill (D27). STACK per archetype family. -->

## Objective

For each **box-diagram** layout authored in T-211 — **`process-3/4/5`**, **`kpi-3/4/5`**, **`funnel-3/4/5`**, **`feature-grid-3/4/5`**, **`roadmap-3/4/5`** (= 15); **`pyramid-3/4`** (= 2); **`matrix-2x2`** (+ optional **`matrix-9box`**, = 1–2); **`big-number`** (= 1); **`quote`** (= 1) — **consume** the Setup-authored Zod layout schemas and catalogue entries from T-211 (do **not** hand-edit schemas in feature work; §5). Add valid + invalid fixtures and end-to-end fill tests. Sub-slotted cells fill through the existing text/content handlers; each cell honours its D26 band. **Stack per family.**

## Acceptance criteria (must be machine-checkable)

- [ ] Each listed `layoutId` validates + fills end-to-end → `tests/` (a Phase-6 acceptance block): fill `fixtures/layouts/valid-<layout>.json`, assert cell values; `fixtures/invalid/<layout>-*.json` rejected with exit 2.
- [ ] Schemas + catalogue entries are **consumed from T-211 Setup authorship** — no ad-hoc edits under `src/schema/layouts/` (§5).
- [ ] Catalogue carries each layout's `regions` + per-cell fill-bands; the drift test stays green.
- [ ] Cardinality matches D27 enumeration above (15 linear + 2 pyramid + 1–2 matrix + 2 singular = 20–21 box layouts).
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/schema/layouts/` — **read-only consumption** of Setup-authored schemas (frozen; §5).
- `skills/report-pptx/layout-catalogue.json`; `fixtures/layouts/valid-*.json`; `fixtures/invalid/*`.
- `tests/`.

## Out of scope

- Table archetypes (→ T-213a/b/c); master design + schema generation (→ T-211).

## Risks / do-not-touch

- Only catalogue `layoutId`s are valid; objects are `.strict()`; chart kinds are unchanged (D21). Do not touch the existing 26 layouts or hand-edit `layout-spec.json` / schemas (§5).

## Meta

- mode: medium
- depends-on: T-211, T-201
- parallel-safe: yes # across families once T-211 lands; stack per family
- size budget: < 300 changed lines per family sub-PR
