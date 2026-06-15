# T-220: Strip orphan slide parts from the saved package (bug)

<!-- Found during the Phase 6 design grill — separate from D26/D27.
     2026-06-15: premise revised after an empirical probe (see "Investigation findings"). -->

## Objective

The saved `.pptx` retains the master's slide XML parts (and their pre-authored charts / embeddings / media) that `removeExistingSlides: true` drops from `presentation.xml` but **leaves orphaned in the package** (already noted at `tests/helpers/pptx-shapes.ts:52`). A 4-layout plan ships **30** `ppt/slides/slideN.xml` parts for **4** visible slides; the `climate-change-explainer.pptx` deck carries **26** orphan parts (~600 KB of invisible bloat) behind its 16 visible slides. Invisible to the viewer, but bloats every deck and risks strict-validator "repair" prompts. Strip every slide part (and now-unreferenced charts / embeddings / rels / media) not reachable from `presentation.xml`, so on-disk slide parts == the `sldIdLst`.

**Implementation constraint (§5, D7, D25):** cleanup must be **`pptx-automizer`-native** (or an upstream fix in that library). Runtime **JSZip package surgery** and **relationship-graph parsing in the pipeline are forbidden** — only stack libs touch OOXML (§5); D7 rejects runtime Office parsing; D25 requires a new decision covering D7, failure classification, and atomic save/rename before any runtime post-save pass. Do not implement ad-hoc zip surgery.

## Investigation findings (2026-06-15 — supersedes the original "expected BLOCKED" premise)

A probe on `fixtures/valid-real-multi-layout-plan.json` (4 layouts) established:

1. **`pptx-automizer` 0.8.1 HAS native orphan cleanup.** The `Automizer` constructor accepts `cleanup?: boolean` ("*Eventually remove all unnecessary files from archive*", backed by `ModifyPresentationHelper.removeUnusedFiles` / `removedUnusedImages`). The task's old default — "no native cleanup → land BLOCKED behind a new ADR" — is **falsified**. This is a §5/D7-compliant constructor flag, not zip surgery.
2. **Setting `cleanup: true` reaps the orphan parts:** slide parts 30 → **4** (== 4 `sldId`); chart/embed parts 19 → 5; file size 1,097,742 → 786,252 bytes (**−28.4%**). `sldIdLst` correctly rewires to the 4 survivors.
3. **BUT `cleanup` alone produces a corrupt visible slide — because of a latent T-104 (chart data-swap) bug.** The chart data-swap **appends** the new chart as a `…-created` relationship but **never removes the master's original chart rel** from the visible slide. Example: `slide30.xml.rels` carries a stale `rId2 → ../charts/chart1.xml` *alongside* the swapped-in `chart5/chart6`, and `rId2` is still referenced in the slide body. Today this is harmless only because `chart1.xml` lingers as a present-but-unused orphan. With `cleanup: true` its target is reaped → **a relationship on a VISIBLE slide pointing at a missing part** → PowerPoint "repair" risk. (`cleanup` also leaves dangling slide rels `rId5–rId30 → slide1–26.xml` in `presentation.xml.rels`; lower severity — unreferenced by `sldIdLst` — but the same smell.)
4. **`cleanup: true` breaks 31 existing tests** — mostly because cleanup renumbers parts and helpers hard-code names (`ppt/charts/chart1.xml`, `slide1.xml`). These helpers must resolve parts **via rels**, not literal numbers.
5. **Not verified in this probe:** actual PowerPoint open-without-repair (no PowerPoint / LibreOffice / Open-XML-SDK validator available in the probe env). The implementer must validate open-ability on real output.

**Revised conclusion:** this is **not** a blocked-without-a-path task and **not** a one-line flag flip. The correct unit of work is to **fix the chart data-swap to REPLACE rather than ADD** (remove the original chart relationship + part from the slide via `pptx-automizer`'s modify helpers), **then** enable `cleanup: true`, **then** de-brittle the test helpers. The T-104 fix is ordinary pipeline logic over automizer's API — not forbidden zip surgery — so no new ADR is required unless the implementer finds the stale-rel removal is impossible through automizer (only then does the D25 precedent re-apply).

## Acceptance criteria (must be machine-checkable)

- [ ] **Chart data-swap replaces, not appends:** after a swap, the visible slide's `.rels` references **only** the swapped-in chart(s); the original master chart rel is removed and its now-unreferenced part is reaped. No visible-slide rel points at a missing part (assert over every slide in `presentation.xml`'s `sldIdLst`).
- [ ] `cleanup: true` (or equivalent automizer-native option) is enabled in `src/pipeline/load-master.ts`. For `fixtures/valid-real-multi-layout-plan.json` (4 layouts), the saved `.pptx` has exactly **4** `ppt/slides/slideN.xml` parts (== `sldId` count) and **no** orphaned chart/embedding parts → `tests/` (count parts vs `sldIdLst`; assert every `*.rels` target exists on disk).
- [ ] Visible slides, their (swapped) charts, and brand are unchanged — existing pipeline/output-format-gate tests stay green (update helpers to resolve parts via rels, not literal `chartN.xml`/`slideN.xml` names).
- [ ] File size on the 4-layout fixture is **measurably smaller** than the pre-fix baseline (probe measured −28.4% from `cleanup` alone; replacing the stale chart parts should push it further). State the achieved % alongside the part-count check rather than asserting an arbitrary fixed threshold.
- [ ] Cleanup uses **`pptx-automizer` only** — no runtime JSZip/relationship-graph surgery in `src/pipeline/`.
- [ ] Open-ability validated: the cleaned 4-layout output opens in PowerPoint (or an Open-XML-SDK / equivalent validator) **without a repair prompt**. Record how it was checked.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

**Only if the stale-chart-rel removal proves impossible through `pptx-automizer`:**

- [ ] Task is **BLOCKED** with a documented stop note citing D25 precedent and the specific missing capability; no runtime JSZip/relationship-graph workaround is implemented.
- [ ] A follow-up ADR/decision is scoped covering D7, failure classification, and atomic save/rename.

## Files likely involved

- `src/pipeline/load-master.ts` — enable `cleanup: true` on the `Automizer` constructor.
- `src/pipeline/` — chart data-swap (T-104 path): remove the original chart rel/part on swap (automizer modify helpers).
- `tests/helpers/pptx-shapes.ts` / `tests/helpers/pptx-chart.ts` — resolve parts via rels, not literal `slideN.xml` / `chartN.xml` (the comment at `pptx-shapes.ts:52` documents the orphan behaviour); `tests/`.

## Out of scope

- D26 / D27 work. A new ADR — needed **only** if automizer cannot remove the stale chart rel (no longer the expected outcome).

## Risks / do-not-touch

- Remove **only** parts truly unreachable from `presentation.xml`; never drop a part a visible slide references. **Do not** implement runtime JSZip surgery or relationship-graph parsing (§5, D7). If automizer cannot remove the stale chart rel, **stop and open a new decision** (D25 precedent) — do not work around with zip tools. Do not change visible output.

## Meta

- mode: medium # ordinary automizer-native fix; ADR only if stale-rel removal is impossible via automizer
- depends-on: — # couples to the T-104 chart-swap path (fix the append→replace bug there)
- parallel-safe: yes
- size budget: < 300 changed lines
