# T-210: `table` region-kind + fill handler (D27 enabler)

<!-- Output of the Phase 6 design grill (D27). One unit of work, small enough to review. -->

## Objective

Introduce a new **`table` region-kind** and a fill handler that **swaps row data into a pre-authored master table inside its fixed frame** — the D21 chart data-swap philosophy applied to tables (`pptx-automizer` table modification). Columns are fixed by the master design; rows grow up to a geometry-derived max; no *other* shape moves. Wire it into the `fillSlot` dispatcher. This unblocks the row/table archetypes (T-213).

## Acceptance criteria (must be machine-checkable)

- [ ] `fillSlot` routes `regionKind: 'table'` to a new `fill-table-slot` handler that sets a master table's rows from the fill-plan → `tests/` fills a fixture table layout and asserts cell values + row count.
- [ ] Schema: a `table` block (columns; rows ≤ a geometry-derived max; per-cell caps). Over-max rows / unknown keys are **rejected** (exit 2) — never truncated.
- [ ] The D26 band for a table = comfortable row count for the frame; drift test covers it.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/schema/` — `table` block + region-kind.
- `src/pipeline/fill-real-layout.ts` — dispatch; `src/pipeline/fill-table-slot.ts` (new).
- `tests/` + one authored table fixture (from T-211, or a minimal authored table slide).

## Out of scope

- The specific RAG / comparison / generic layouts (→ T-213); box-diagram archetypes (→ T-212).

## Risks / do-not-touch

- Only `pptx-automizer` touches OOXML (§5). Do not reflow neighbours. If the lib cannot modify a given table cleanly, surface a `MasterError` loudly — never silently skip (ERROR_HANDLING.md).

## Meta

- mode: medium # new region-kind + pipeline boundary
- depends-on: T-201, T-211 (≥1 authored table slide to test against)
- parallel-safe: no
- size budget: < 300 changed lines
