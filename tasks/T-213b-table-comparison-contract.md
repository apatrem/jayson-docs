# T-213b: Table archetype contract — `table-comparison` (D27)

<!-- Output of the Phase 6 design grill (D27). Builds on the `table` region-kind (T-210). -->

## Objective

On top of the `table` region-kind (T-210) and the authored `table-comparison` slide (T-211), **consume** the Setup-authored Zod schema and catalogue entry for **`table-comparison`**: column count/order/identity pinned in the layout schema; fill-plan supplies **row values only**. Add valid + invalid fixtures and end-to-end fill test (rows swapped into the master table inside its fixed frame).

## Acceptance criteria (must be machine-checkable)

- [ ] `table-comparison` fills end-to-end → `tests/`: assert cell values + row count for `fixtures/layouts/valid-table-comparison.json`.
- [ ] Schema **pins columns**; fill-plan `table` block has **no `columns` key**; a test proves master column count/widths are **unchanged** after fill.
- [ ] Over-max rows / bad cells rejected with exit 2 (never truncated).
- [ ] Schema + catalogue entry **consumed from T-211 Setup authorship** — no ad-hoc edits under `src/schema/layouts/` (§5).
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/schema/layouts/` — **read-only consumption** of Setup-authored `table-comparison` schema (frozen; §5).
- `skills/report-pptx/layout-catalogue.json`; `fixtures/layouts/valid-table-comparison.json`; `fixtures/invalid/table-comparison-*.json`.
- `tests/`.

## Out of scope

- The table fill mechanism itself (→ T-210); `table-rag` / `table-generic` (→ T-213a/c); box-diagrams (→ T-212).

## Risks / do-not-touch

- Never truncate rows — reject (ERROR_HANDLING.md). Only `pptx-automizer` touches OOXML (§5). Do not hand-edit schemas (§5).

## Meta

- mode: medium
- depends-on: T-210, T-211
- parallel-safe: yes # after T-210; stack with T-213a/c
- size budget: < 300 changed lines
