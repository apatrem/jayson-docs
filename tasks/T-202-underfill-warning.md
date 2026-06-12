# T-202: CLI under-fill soft-warning (D26)

<!-- Output of the Phase 6 design grill (D26). One unit of work, small enough to review. -->

## Objective

Emit a **symmetric under-fill soft-warning** (exit 0, stderr) when a filled region's content falls **below** its D26 comfortable-fill lower bound — the mirror of the existing over-optimal (D23) warning. Non-blocking; the per-kind hard `max` Zod reject is unchanged. This turns under-fill into a checkable signal the BYO LLM / human can iterate against.

## Acceptance criteria (must be machine-checkable)

- [ ] When a region's content `< band.lower`, the CLI prints a stderr warning naming the slide + region + the band, and exits **0** → covered by `tests/density-caps.test.ts` (assert stderr text + exit 0).
- [ ] Over-optimal (D23) and under-fill (D26) warnings **coexist**; neither blocks; over-`max` still rejects with exit **2**.
- [ ] Warnings go to **stderr only**, never stdout; nothing is auto-fixed.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/cli/` / `src/pipeline/` — wherever the over-optimal warning is emitted today; add the symmetric lower-bound check.
- `tests/density-caps.test.ts` (or sibling).

## Out of scope

- Band derivation (→ T-201); skill text (→ T-203).

## Risks / do-not-touch

- Do not change exit codes for validation/`max`. Never auto-truncate or "fix" (ERROR_HANDLING.md). Warnings are advisory.

## Meta

- mode: low
- depends-on: T-201
- parallel-safe: no # consumes the T-201 band
- size budget: < 300 changed lines
