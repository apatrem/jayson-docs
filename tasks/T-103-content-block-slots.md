# T-103: Content-block slots (bullets / text / callout / image)

<!-- Output of Phase 2 (/agentic-workflow:plan). Phase 5 — fill pipeline for the 26 real layouts. -->

## Objective

Fill **content-block** slots via T-101's engine: `bullets` (multi-text), `text` / `callout` (text), and `image` (`ref`) into the `body-left` / `body-right` / `body-center` slots of the multi-column layouts (`two-columns`, `narrative-with-sidebar`, `two-column-with-subheads`, `three-columns-and-subtitles`, `title-and-content`) and the `cover` body + image. Resolve project-relative image refs from the CLI working directory and load them through `pptx-automizer`; no other OOXML/image library is introduced.

## Acceptance criteria (must be machine-checkable)

- [ ] Filling `fixtures/layouts/valid-two-columns.json` and `valid-narrative-with-sidebar.json` sets `body-left`/`body-right` content correctly: exact text round-trips and each bullet produces a PowerPoint bullet paragraph → un-skip + pass `tests/phase5-acceptance.test.ts` › **T-103**.
- [ ] Filling `fixtures/layouts/valid-cover.json` replaces `slot.image` with the exact bytes from `fixtures/assets/test-logo.svg`; the test follows the named shape's relationship rather than merely checking that some media exists.
- [ ] The frozen master/spec has **no** `slot.image.caption`. If a schema-valid image includes `caption`, fail before composition with a `shape-name` error naming `slot.image.caption`; never silently drop it. Caption rendering stays deferred until Setup adds a named caption shape and regenerates the protected spec/schema contracts.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/pipeline/` — content-block fill (bullets→`modify.setMultiText`, text/callout→`modify.setText`, image→`loadMedia` + `ModifyImageHelper.setRelationTargetCover`).
- `tests/phase5-acceptance.test.ts` — un-skip the T-103 block.

## Out of scope

- Chart slots (→ T-104), pure text slots (→ T-102), skill (→ T-105), dynamic image generation.

## Risks / do-not-touch

- Do NOT change `src/schema/**` or `src/setup/layout-spec.json`. Reject content that violates the schema — never auto-truncate (`ERROR_HANDLING.md`). Don't regress T-101/kpi.

## Meta

- mode: medium # image relations + explicit caption rejection cross the OOXML boundary
- risk: medium
- depends-on: T-101, T-102
- parallel-safe: no # shares the generic dispatcher and acceptance file; land before T-104
- size budget: < 300 changed lines
