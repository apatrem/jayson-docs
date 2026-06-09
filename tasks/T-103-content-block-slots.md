# T-103: Content-block slots (bullets / text / callout / image)

<!-- Output of Phase 2 (/agentic-workflow:plan). Phase 5 — fill pipeline for the 26 real layouts. -->

## Objective
Fill **content-block** slots via T-101's engine: `bullets` (multi-text), `text` / `callout` (text), and `image` (ref + optional caption) into the `body-left` / `body-right` / `body-center` slots of the multi-column layouts (`two-columns`, `narrative-with-sidebar`, `two-column-with-subheads`, `three-columns-and-subtitles`, `title-and-content`) and the `cover` body + image/caption.

## Acceptance criteria (must be machine-checkable)
- [ ] Filling `fixtures/layouts/valid-two-columns.json` and `valid-narrative-with-sidebar.json` sets `body-left`/`body-right` content correctly: bullets render as bulleted multi-text; `text`/`callout` render as text → un-skip + pass `tests/phase5-acceptance.test.ts` › **T-103**.
- [ ] `cover` image slot sets the image `ref`; caption (when present) lands in `slot.*.caption`.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved
- `src/pipeline/` — content-block slot fill (bullets→`modify.setMultiText`, text/callout→`modify.setText`, image→ref/caption).
- `tests/phase5-acceptance.test.ts` — un-skip the T-103 block.

## Out of scope
- Chart slots (→ T-104), pure text slots (→ T-102), skill (→ T-105), dynamic image generation.

## Risks / do-not-touch
- Do NOT change `src/schema/**` or `src/setup/layout-spec.json`. Reject content that violates the schema — never auto-truncate (`ERROR_HANDLING.md`). Don't regress T-101/kpi.

## Meta
- mode: low                 # bump to medium if image embedding proves fiddly
- risk: low
- depends-on: T-101
- parallel-safe: yes        # parallel with T-102 and T-104
- size budget: < 300 changed lines
