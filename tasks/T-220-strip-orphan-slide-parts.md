# T-220: Strip orphan slide parts from the saved package (bug)

<!-- Found during the Phase 6 design grill — separate from D26/D27. -->

## Objective

The saved `.pptx` retains the master's slide XML parts (and their pre-authored charts / embeddings / media) that `removeExistingSlides: true` drops from `presentation.xml` but **leaves orphaned in the package** (already noted at `tests/helpers/pptx-shapes.ts:52`). A 4-layout plan ships **30** `ppt/slides/slideN.xml` parts for **4** visible slides; the `climate-change-explainer.pptx` deck carries **26** orphan parts (~600 KB of invisible bloat) behind its 16 visible slides. Invisible to the viewer, but bloats every deck and risks strict-validator "repair" prompts. Strip every slide part (and now-unreferenced charts / embeddings / rels / media) not reachable from `presentation.xml`, so on-disk slide parts == the `sldIdLst`.

**Implementation constraint (§5, D7, D25):** cleanup must be **`pptx-automizer`-native** (or an upstream fix in that library). Runtime **JSZip package surgery** and **relationship-graph parsing in the pipeline are forbidden** — only stack libs touch OOXML (§5); D7 rejects runtime Office parsing; D25 requires a new decision covering D7, failure classification, and atomic save/rename before any runtime post-save pass. **Default expected outcome:** the bug evidence (`removeExistingSlides` drops `sldId`s but leaves orphan parts) strongly implies `pptx-automizer` 0.8.1 has **no native orphan-cleanup** — so this task is **expected to land BLOCKED** behind a new decision/ADR (cite D25's precedent) unless investigation finds an automizer-supported cleanup option. Do not implement ad-hoc zip surgery.

## Acceptance criteria (must be machine-checkable)

**If automizer supports cleanup (best case):**

- [ ] For `fixtures/valid-real-multi-layout-plan.json` (4 layouts), the saved `.pptx` has exactly **4** `ppt/slides/slideN.xml` parts (== `sldId` count) and **no** orphaned chart/embedding parts → `tests/` (count parts vs `sldIdLst`).
- [ ] Visible slides, their charts, and brand are unchanged — existing pipeline/output-format-gate tests stay green.
- [ ] File size on the 4-layout fixture is **≥ 30% smaller** than the pre-fix baseline (concrete threshold alongside the part-count check).
- [ ] Cleanup uses **`pptx-automizer` only** — no runtime JSZip/relationship-graph surgery in `src/pipeline/`.

**If automizer lacks cleanup (expected default):**

- [ ] Task is **BLOCKED** with a documented stop note citing D25 precedent and the missing capability; no runtime JSZip/relationship-graph workaround is implemented.
- [ ] A follow-up ADR/decision is scoped covering D7, failure classification, and atomic save/rename.

- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/pipeline/` — automizer-native cleanup (or blocked pending new ADR).
- `tests/helpers/pptx-shapes.ts` (the comment documenting the orphan behaviour); `tests/`.

## Out of scope

- D26 / D27 work. A new ADR if automizer lacks cleanup support (expected blocked state).

## Risks / do-not-touch

- Remove **only** parts truly unreachable from `presentation.xml`; never drop a part a visible slide references. **Do not** implement runtime JSZip surgery or relationship-graph parsing (§5, D7). If automizer cannot clean orphans, **stop and open a new decision** (D25 precedent) — do not work around with zip tools. Do not change visible output.

## Meta

- mode: medium # likely needs a new ADR before implementation; automizer orphan-cleanup may not exist
- depends-on: —
- parallel-safe: yes
- size budget: < 300 changed lines
