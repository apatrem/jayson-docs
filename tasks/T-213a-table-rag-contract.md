# T-213a: Table archetype contract — `table-rag` (D27)

<!-- Output of the Phase 6 design grill (D27). Builds on the `table` region-kind (T-210). -->

## Objective

On top of the `table` region-kind (T-210) and the authored `table-rag` slide (T-211), **consume** the Setup-authored Zod schema and catalogue entry for **`table-rag`**: column count/order/identity pinned in the layout schema; fill-plan supplies **row values only**. Add valid + invalid fixtures and end-to-end fill test (rows swapped into the master table inside its fixed frame).

## Acceptance criteria (must be machine-checkable)

- [ ] `table-rag` fills end-to-end → `tests/`: assert cell values + row count for `fixtures/layouts/valid-table-rag.json`.
- [ ] Schema **pins columns**; fill-plan `table` block has **no `columns` key**; a test proves master column count/widths are **unchanged** after fill.
- [ ] Over-max rows / bad cells rejected with exit 2 (never truncated); RAG status is a **closed enum** (e.g. red/amber/green) — other values rejected.
- [ ] Schema + catalogue entry **consumed from T-211 Setup authorship** — no ad-hoc edits under `src/schema/layouts/` (§5).
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/schema/layouts/` — **read-only consumption** of Setup-authored `table-rag` schema (frozen; §5).
- `skills/report-pptx/layout-catalogue.json`; `fixtures/layouts/valid-table-rag.json`; `fixtures/invalid/table-rag-*.json`.
- `tests/`.

## Out of scope

- The table fill mechanism itself (→ T-210); `table-comparison` / `table-generic` (→ T-213b/c); box-diagrams (→ T-212).

## Risks / do-not-touch

- Never truncate rows or coerce an out-of-enum RAG status — reject (ERROR_HANDLING.md). Only `pptx-automizer` touches OOXML (§5). Do not hand-edit schemas (§5).

## Meta

- mode: medium
- depends-on: T-210, T-211
- parallel-safe: yes # after T-210; stack with T-213b/c
- size budget: < 300 changed lines
