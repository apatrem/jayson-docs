# T-102: Generic text slots across the text layouts

<!-- Output of Phase 2 (/agentic-workflow:plan). Phase 5 — fill pipeline for the 26 real layouts. -->

## Objective

Using T-101's generic engine, fill the shared **word/text region** slots — `title`, `section-title`, `subtitle` (text / callout), and `source` — across the text-bearing real layouts (`cover`/`-white`, `section`/`-white`, `agenda`/`-white`, `title`, `title-only`, `title-and-subtitle`, and the column layouts). `chart-title` is verified with the chart-bearing layouts in T-104 so this task does not depend on an unimplemented chart handler.

## Acceptance criteria (must be machine-checkable)

- [ ] Filling `fixtures/layouts/valid-cover.json` and `valid-title-and-subtitle.json` sets `slot.title`, `slot.subtitle`, and `slot.source` to the exact fixture values → un-skip + pass `tests/phase5-acceptance.test.ts` › **T-102**.
- [ ] `subtitle` handles both `kind: text` and `kind: callout`; the frozen test constructs the callout variant and asserts the exact body text.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/pipeline/` — extend the slot-fill helper for the `words`/subtitle/source/chart-title region kinds.
- `tests/phase5-acceptance.test.ts` — un-skip the T-102 block; add fixtures as needed.

## Out of scope

- Content-block slots (→ T-103), chart slots (→ T-104), skill changes (→ T-105).

## Risks / do-not-touch

- Do NOT change `src/schema/**` or `src/setup/layout-spec.json`. Do NOT regress T-101 or kpi-row-chart. Brand/master immutable.

## Meta

- mode: low
- risk: low
- depends-on: T-101
- parallel-safe: no # shares the generic dispatcher and acceptance file; land before T-103
- size budget: < 300 changed lines
