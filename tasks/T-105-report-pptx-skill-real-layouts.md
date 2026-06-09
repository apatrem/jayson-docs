# T-105: Layout catalogue + report-pptx skill + canonical-master e2e

<!-- Output of Phase 2 (/agentic-workflow:plan). Phase 5 — integration / end-to-end. -->

## Objective

Now that all slot kinds fill (T-101–T-104), deliver the LLM-facing **Layout catalogue required by D16/D22**, then update the **report-pptx skill** + manifest so the BYO LLM can choose among the 26 real `layoutId`s and fill `templates/report.master.pptx`. Remove the "**v1 = `kpi-row-chart` only / Phase 5**" fence from the skill and docs. Prove a multi-layout deck end-to-end through the CLI.

## Acceptance criteria (must be machine-checkable)

- [ ] Add `skills/report-pptx/layout-catalogue.json` with all 26 layouts. Each entry has `layoutId`, `tier`, a non-empty `usage` instruction, and a descriptive `regions` value for every non-footer named slot. The catalogue's top-level `caps` mirrors `REGION_CAPS`.
- [ ] Add a drift test: catalogue IDs/tiers/region keys match `src/setup/layout-spec.json`, pinned chart kinds match, and catalogue caps deep-equal `src/schema/caps.ts`. This is the D22 dual-source guardrail.
- [ ] `skills/report-pptx/SKILL.md` reads the catalogue, prefers `common` layouts, justifies `less-common`, fills only catalogue slots, and invokes `templates/report.master.pptx`; `skills/manifest.json` no longer restricts to `kpi-row-chart`.
- [ ] CLI `fill` of `fixtures/valid-real-multi-layout-plan.json` (`cover` + `section` + `two-columns` + `chart-stacked-column`) produces four slides with exact per-slide named-shape values and chart data → un-skip + pass `tests/phase5-acceptance.test.ts` › **T-105**.
- [ ] `docs/SLIDE_LAYOUT_LIBRARY.md`, `skills/README.md`, and the D20/D22 status text accurately distinguish the completed 26-layout report-pptx path from still-deferred DOCX/dynamic-chart work.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `skills/report-pptx/layout-catalogue.json` + its drift test.
- `skills/report-pptx/SKILL.md`, `skills/manifest.json`, `skills/README.md`, `docs/SLIDE_LAYOUT_LIBRARY.md`.
- `fixtures/` — a multi-layout real fill-plan fixture.
- `tests/phase5-acceptance.test.ts` — un-skip the T-105 block.

## Out of scope

- DOCX path; dynamic/from-scratch charts; general Setup automation.

## Risks / do-not-touch

- **No LLM call in this codebase** (D11/D15) — the skill instructs an external BYO LLM. Do NOT change `src/schema/**`. Keep the bundled-app invocation contract intact.

## Meta

- mode: medium # publishes the LLM-facing selection contract and closes the e2e path
- risk: medium
- depends-on: T-101, T-102, T-103, T-104
- parallel-safe: no # integration step — runs last, after the four slot tasks merge
- size budget: < 300 changed lines (excl. the fixture)
