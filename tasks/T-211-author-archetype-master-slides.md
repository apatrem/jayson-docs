# T-211: Author the new archetype master slides + regenerate layout-spec (D27)

<!-- Output of the Phase 6 design grill (D27). Manual design + Setup; STACK per archetype family. -->

## Objective

Design the ≈36 new archetype layout slides on `templates/report.master.pptx`, **drafted to the master's existing theme** (accent palette, 8/12/18/22 type scale, its rectangle/accent styles — never invented styling), name every fillable shape per the convention (including **sub-slotted cells** `slot.<region>.<cell>.<sub>`), pass the **brand sign-off gate**, and regenerate `src/setup/layout-spec.json` via the Setup scripts. This manual-design prerequisite unblocks the contract tasks (T-212/T-213). **Stack into sub-PRs per archetype family** to stay within the size budget.

## Acceptance criteria (must be machine-checkable)

- [ ] Each authored archetype slide carries named `slot.*` shapes (incl. sub-slots) and passes the `shapes ≡ slots` validator; `src/setup/layout-spec.json` is **regenerated** (not hand-edited) → `tests/setup-master.test.ts` extended for the new layouts.
- [ ] Brand sign-off recorded (visual diff vs the existing 26 on the Acme placeholder master).
- [ ] The T-201 deriver emits comfortable-fill bands for every new box.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `templates/report.master.pptx` — designed slides.
- `src/setup/` — rename + regenerate; `src/setup/layout-spec.json` (regenerated output).
- `docs/setup/naming-table.md`; `tests/setup-master.test.ts`.

## Out of scope

- Zod schemas + catalogue entries + fixtures (→ T-212/T-213); the table fill mechanism (→ T-210).

## Risks / do-not-touch

- Reuse the master theme — never invent styling (D27 sign-off gate). `layout-spec.json` is **generated, never hand-edited** (§5). Leave the existing 26 layouts untouched. Stack per family (matrix / process / kpi / funnel / pyramid / feature-grid / roadmap / tables) so each PR stays < 300 lines.

## Meta

- mode: medium # gated by brand sign-off; gates T-212/T-213
- depends-on: T-201
- parallel-safe: no # but sub-PRs per family stack
- size budget: < 300 changed lines per family sub-PR
