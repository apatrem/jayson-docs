# T-220: Strip orphan slide parts from the saved package (bug)

<!-- Found during the Phase 6 design grill — separate from D26/D27. -->

## Objective

The saved `.pptx` retains the master's slide XML parts (and their pre-authored charts / embeddings / media) that `removeExistingSlides: true` drops from `presentation.xml` but **leaves orphaned in the package** (already noted at `tests/helpers/pptx-shapes.ts:52`). A 4-layout plan ships **30** `ppt/slides/slideN.xml` parts for **4** visible slides; the `climate-change-explainer.pptx` deck carries **26** orphan parts (~600 KB of invisible bloat) behind its 16 visible slides. Invisible to the viewer, but bloats every deck and risks strict-validator "repair" prompts. Strip every slide part (and now-unreferenced charts / embeddings / rels / media) not reachable from `presentation.xml`, so on-disk slide parts == the `sldIdLst`.

## Acceptance criteria (must be machine-checkable)

- [ ] For `fixtures/valid-real-multi-layout-plan.json` (4 layouts), the saved `.pptx` has exactly **4** `ppt/slides/slideN.xml` parts (== `sldId` count) and **no** orphaned chart/embedding parts → `tests/` (count parts vs `sldIdLst`).
- [ ] Visible slides, their charts, and brand are unchanged — existing pipeline/output-format-gate tests stay green.
- [ ] File size materially smaller on the multi-layout fixture.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/pipeline/` — post-save cleanup (or a `pptx-automizer` 0.8.1 option if one exists).
- `tests/helpers/pptx-shapes.ts` (the comment documenting the orphan behaviour); `tests/`.

## Out of scope

- D26 / D27 work.

## Risks / do-not-touch

- Remove **only** parts truly unreachable from `presentation.xml` (walk the rels graph); never drop a part a visible slide references. `pptx-automizer` is the OOXML tool (§5); if manual zip surgery is needed, stay inside the `jszip` already in deps. Do not change visible output.

## Meta

- mode: low # bounded bug fix
- depends-on: —
- parallel-safe: yes
- size budget: < 300 changed lines
