# T-211: Author the new archetype master slides + regenerate Setup contracts (D27)

<!-- Output of the Phase 6 design grill (D27). Manual design + Setup; STACK per archetype family. -->

## Objective

Design the **23–24 new archetype layout slides** (23 + 1 optional `matrix-9box`) on `templates/report.master.pptx`, **drafted to the master's existing theme** (accent palette, 8/12/18/22 type scale, its rectangle/accent styles — never invented styling). **Authoring is Setup-time, human-owned (or human-gated) design** — distinct from the runtime fill path where the BYO LLM never chooses coordinates/sizes/fonts/colours (D8/D13/§5 unchanged). Name every fillable shape per the convention (including **sub-slotted cells** `slot.<region>.<cell>.<sub>`), pass the **brand sign-off gate**, and regenerate **`src/setup/layout-spec.json`** via Setup plus **Setup-authored** per-layout Zod schemas under `src/schema/layouts/` and catalogue entries (hand-written under human review, like the existing 26 — D22 Phase 3; **frozen** against feature-work edits — §5). This manual-design prerequisite unblocks the contract tasks (T-212/T-213a/b/c). **Stack into sub-PRs per archetype family** to stay within the size budget.

**Exact `layoutId` scope (23 + 1 optional):** `process-3/4/5`, `kpi-3/4/5`, `funnel-3/4/5`, `feature-grid-3/4/5`, `roadmap-3/4/5` (= 15); `pyramid-3/4` (= 2); `matrix-2x2` (+ optional `matrix-9box`, = 1–2); `big-number` (= 1); `quote` (= 1); `table-rag`, `table-comparison`, `table-generic` (= 3).

## Acceptance criteria (must be machine-checkable)

- [ ] Each authored archetype slide carries named `slot.*` shapes (incl. sub-slots) and passes the `shapes ≡ slots` validator; `src/setup/layout-spec.json` is **regenerated** (not hand-edited) → `tests/setup-master.test.ts` extended for the new layouts.
- [ ] Setup **authors** per-layout Zod schemas under `src/schema/layouts/` (hand-written under human review, like the existing 26) + catalogue entries; schemas are **frozen** against feature-work edits (§5). A schema drift-guard, if desired, is **new work** — not assumed pre-existing.
- [ ] Brand sign-off recorded in **`docs/setup/phase6-brand-signoff.md`** (sign-off note) + completed **visual-diff checklist** (named checklist section in that file) against the existing 26 on the Acme placeholder master.
- [ ] The T-201 deriver emits comfortable-fill bands for every new box.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `templates/report.master.pptx` — designed slides.
- `src/setup/` — rename + regenerate; `src/setup/layout-spec.json` (regenerated output).
- `src/schema/layouts/` — Setup-authored per-layout schemas (frozen; not edited in feature work).
- `docs/setup/naming-table.md`; `docs/setup/phase6-brand-signoff.md`; `tests/setup-master.test.ts`.

## Out of scope

- Consuming generated schemas in fixtures/tests beyond Setup drift (→ T-212/T-213a/b/c); the table fill mechanism (→ T-210).

## Risks / do-not-touch

- Reuse the master theme — never invent styling (D27 sign-off gate). `layout-spec.json` is regenerated via Setup; `src/schema/layouts/**` is **Setup-authored and frozen** — feature work must not hand-edit (§5). Leave the existing 26 layouts untouched. Stack per family (matrix / process / kpi / funnel / pyramid / feature-grid / roadmap / tables) so each PR stays < 300 lines.

## Meta

- mode: medium # gated by brand sign-off; gates T-212/T-213a/b/c
- depends-on: T-201
- parallel-safe: no # but sub-PRs per family stack
- size budget: < 300 changed lines per family sub-PR
