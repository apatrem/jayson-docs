# T-102: Generic text slots across the text layouts

<!-- Output of Phase 2 (/agentic-workflow:plan). Phase 5 — fill pipeline for the 26 real layouts. -->

## Objective
Using T-101's generic engine, fill every **word/text region** slot — `title`, `section-title`, `subtitle` (text / callout), `chart-title`, `source` — across the text-bearing real layouts (`cover`/`-white`, `section`/`-white`, `agenda`/`-white`, `title`, `title-only`, `title-and-subtitle`, and the text slots of the column/chart layouts).

## Acceptance criteria (must be machine-checkable)
- [ ] Filling `fixtures/layouts/valid-cover.json`, `valid-agenda.json`, and `valid-title-and-subtitle.json` sets each text/subtitle/source slot in the output to the fixture value → un-skip + pass `tests/phase5-acceptance.test.ts` › **T-102** (assert `slot.title`, `slot.subtitle*`, `slot.source` etc. round-trip).
- [ ] `subtitle` handles both `kind: text` and `kind: callout` bodies.
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
- parallel-safe: yes        # runs in parallel with T-103 and T-104 (different slot kinds, all atop T-101's engine)
- size budget: < 300 changed lines
