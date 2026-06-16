# T-106: CI output-format regression guard for emitted `.pptx`

<!-- Phase 5+ — flagged by D25; rescoped per the PR #27 dual review. One unit of work, small enough to review. -->

## Objective

The pipeline strictly validates its _input_ (fill-plan vs Zod, D23 caps) but trusts its _output_: nothing checks that the `.pptx` written by `save-output.ts` is structurally sound (resolvable relationships, declared content types, loadable parts). A fill-path bug would surface as PowerPoint failing to open a deck. Add a **CI-only regression guard**: a test that re-loads every fixture-driven pipeline output and asserts its structure, so fill-path regressions are caught in CI before a release. This is a regression guard over fixtures, **not** a per-deliverable runtime guarantee (see Out of scope). Design reference (read for ideas, **never copy** — proprietary licence, D25): the validation concepts in Anthropic's pptx skill `scripts/office/`.

## Acceptance criteria (must be machine-checkable)

- [ ] `tests/output-format-gate.test.ts` (new) re-loads every fixture-driven pipeline output `.pptx` using only libraries already in `package.json` (no new dependencies — AGENTS §3) and asserts: the archive opens; `[Content_Types].xml` is present and declares the slide parts; every **internal** relationship target (`TargetMode` absent) resolves to an existing part. Relationships with `TargetMode="External"` (e.g. `slot.source` hyperlinks, D22) are exempt from part resolution.
- [ ] At least one passing fixture contains an external hyperlink relationship, proving the guard does not reject valid `TargetMode="External"` rels.
- [ ] Part well-formedness is asserted by re-loading the emitted file with `pptx-automizer` (its load rejects unreadable/malformed parts) — **not** by adding an XML-parser dependency.
- [ ] A deliberately corrupted output (e.g. an internal relationship pointing at a missing part) fails the guard with a clear, named error — never an auto-"fix" (`ERROR_HANDLING.md`).
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `tests/output-format-gate.test.ts` (new)
- `tests/helpers/pptx-package.ts` (reuse the established jszip read pattern; extend if needed)

## Out of scope

- **Runtime (CLI post-save) gating of real deliverables.** Deliberately excluded: it would require revisiting **D7** (no Office parsing at runtime), a **new `ERROR_HANDLING.md` failure class** (none of the existing six covers a corrupt emitted file), and a **validate-before-rename atomicity** requirement so a failing check can never leave a corrupt file at the output path ("no partial `.pptx`"). If wanted later, that is its own decision + task.
- Full ECMA-376 XSD validation (new dependency — requires explicit approval per AGENTS §3; the ECMA-published XSDs are free to use if approved later).
- Visual/brand regression (headless LibreOffice render diff stays a separate nice-to-have — BUILD_BRIEF §5).
- Copying any code, schemas, or text from `anthropics/skills` (proprietary licence — D25).
- Validating the _input_ fill-plan (already owned by Zod + `scripts/validate.ts`).

## Risks / do-not-touch

- OOXML access: AGENTS §5 names `pptx-automizer`/`pptxgenjs` as the PPTX stack and does **not** list `jszip` — this task relies on the repo's **established read-only jszip pattern** (`src/setup/pptx-shape-utils.ts`, `tests/helpers/pptx-*.ts`), already the de-facto archive layer in setup and tests. Do not introduce any other OOXML tool; if §5 should name the archive layer explicitly, that is a separate one-line AGENTS change to propose, not part of this task.
- No new dependencies without asking (AGENTS §3).
- Never auto-repair a bad output — report and fail (`ERROR_HANDLING.md`).
- No `src/` changes — this task is test-only; pipeline and CLI behaviour must not change.

## Meta

- mode: low # additive CI test; no contract changes (AW-0004)
- risk: low
- depends-on: T-101 (generic engine produces the outputs under test)
- parallel-safe: yes # new test file only
- size budget: < 300 changed lines
