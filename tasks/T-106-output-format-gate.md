# T-106: Post-fill output-format gate for emitted `.pptx`

<!-- Phase 5+ — flagged by D25. One unit of work, small enough to review. -->

## Objective

The pipeline strictly validates its _input_ (fill-plan vs Zod, D23 caps) but trusts its _output_: nothing checks that the `.pptx` written by `save-output.ts` is structurally sound. A bug in the fill path (broken relationship, orphaned part, malformed slide XML) would surface as PowerPoint failing to open a client deliverable. Design and implement a minimal post-fill structural check that catches silent corruption first. Design reference (read for ideas, **never copy** — proprietary licence, D25): the validation concepts in Anthropic's pptx skill `scripts/office/` — XSD conformance, relationship integrity, content-type and slide-layout reference checks.

## Acceptance criteria (must be machine-checkable)

- [ ] A short design note (in the task PR description or a D25 update) fixes two choices: placement (CI-test-only vs CLI post-save check) and, if runtime, the `ERROR_HANDLING.md` failure class + exit code it maps to.
- [ ] Every fixture-driven pipeline output `.pptx` passes a structural re-load check built **only on the stack libraries already in `package.json`** (pptx-automizer / jszip — AGENTS §5): archive opens, `[Content_Types].xml` and `.rels` targets resolve to existing parts, every slide XML parses → covered by `tests/output-format-gate.test.ts`.
- [ ] A deliberately corrupted output fixture (e.g. a relationship pointing at a missing part) fails the check with a clear, named error — never an auto-"fix" (`ERROR_HANDLING.md`).
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `tests/output-format-gate.test.ts` (new)
- `src/pipeline/save-output.ts` + `src/cli/generate.ts` + `ERROR_HANDLING.md` (only if the runtime placement is chosen)

## Out of scope

- Full ECMA-376 XSD validation (new dependency — requires explicit approval per AGENTS §3; the ECMA-published XSDs are free to use if approved later).
- Visual/brand regression (headless LibreOffice render diff stays a separate nice-to-have — BUILD_BRIEF §5).
- Copying any code, schemas, or text from `anthropics/skills` (proprietary licence — D25).
- Validating the _input_ fill-plan (already owned by Zod + `scripts/validate.ts`).

## Risks / do-not-touch

- AGENTS §5: no tool outside the stack libraries touches OOXML — the gate must be built on pptx-automizer/jszip, not a new parser.
- No new dependencies without asking (AGENTS §3).
- Never auto-repair a bad output — report and fail (`ERROR_HANDLING.md`); the "no partial `.pptx`" guarantee must hold.

## Meta

- mode: low # additive check + tests; no contract changes (ADR-0004)
- risk: low
- depends-on: T-101 (generic engine produces the outputs under test)
- parallel-safe: yes # new test file; touches the save path only if runtime placement is chosen
- size budget: < 300 changed lines
