# T-105: report-pptx skill — pick any real layout + fill the canonical master

<!-- Output of Phase 2 (/agentic-workflow:plan). Phase 5 — integration / end-to-end. -->

## Objective
Now that all slot kinds fill (T-101–T-104), update the **report-pptx skill** + manifest so the BYO LLM picks **any of the 26 real `layoutId`s** and fills `templates/report.master.pptx`. Remove the "**v1 = `kpi-row-chart` only / Phase 5**" fence from the skill and docs. Prove a multi-layout deck end-to-end through the CLI.

## Acceptance criteria (must be machine-checkable)
- [ ] CLI `fill` of a multi-layout real fill-plan (e.g. `cover` + `section` + `two-columns` + `chart-stacked-column`) against `templates/report.master.pptx` produces an N-slide deck with each layout's slots filled → un-skip + pass `tests/phase5-acceptance.test.ts` › **T-105** (CLI end-to-end, mirrors the M4 CLI test). Add the multi-layout fixture under `fixtures/`.
- [ ] `skills/report-pptx/SKILL.md` + `skills/manifest.json` no longer restrict to `kpi-row-chart`; `docs/SLIDE_LAYOUT_LIBRARY.md` references are accurate.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved
- `skills/report-pptx/SKILL.md`, `skills/manifest.json`, `docs/SLIDE_LAYOUT_LIBRARY.md`.
- `fixtures/` — a multi-layout real fill-plan fixture.
- `tests/phase5-acceptance.test.ts` — un-skip the T-105 block.

## Out of scope
- DOCX path; dynamic charts; the LLM-facing Layout catalogue (D16 — separate scope).

## Risks / do-not-touch
- **No LLM call in this codebase** (D11/D15) — the skill instructs an external BYO LLM. Do NOT change `src/schema/**`. Keep the bundled-app invocation contract intact.

## Meta
- mode: low             # integration + docs, but it is the end-to-end gate — review carefully
- risk: low
- depends-on: T-101, T-102, T-103, T-104
- parallel-safe: no     # integration step — runs last, after the four slot tasks merge
- size budget: < 300 changed lines (excl. the fixture)
