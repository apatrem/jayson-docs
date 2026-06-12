# T-213: Table archetype contracts — RAG / comparison / generic (D27)

<!-- Output of the Phase 6 design grill (D27). Builds on the `table` region-kind (T-210). -->

## Objective

On top of the `table` region-kind (T-210) and the authored table slides (T-211), add the **RAG / stoplight status table**, **comparison table**, and **generic data table** layouts: Zod schemas, catalogue entries (regions + row fill-band), valid + invalid fixtures, and end-to-end fills (rows swapped into the master table inside its fixed frame).

## Acceptance criteria (must be machine-checkable)

- [ ] Each table `layoutId` fills end-to-end (rows swapped into the master table) → `tests/`: assert cell values + row count for `fixtures/layouts/valid-<layout>.json`.
- [ ] Over-max rows / bad cells rejected with exit 2 (never truncated); RAG status is a **closed enum** (e.g. red/amber/green) — other values rejected.
- [ ] Catalogue entries + drift test green.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/schema/layouts/` — table layouts.
- `skills/report-pptx/layout-catalogue.json`; `fixtures/layouts/valid-*.json`; `fixtures/invalid/*`.
- `tests/`.

## Out of scope

- The table fill mechanism itself (→ T-210); box-diagrams (→ T-212).

## Risks / do-not-touch

- Never truncate rows or coerce an out-of-enum RAG status — reject (ERROR_HANDLING.md). Only `pptx-automizer` touches OOXML (§5).

## Meta

- mode: medium
- depends-on: T-210, T-211
- parallel-safe: no # after T-210
- size budget: < 300 changed lines
