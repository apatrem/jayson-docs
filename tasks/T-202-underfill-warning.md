# T-202: CLI two-sided fill-band soft-warnings (D26)

<!-- Output of the Phase 6 design grill (D26). One unit of work, small enough to review. -->

## Objective

Emit **two-sided soft-warnings** (exit 0, stderr) when a filled **body/content** region's content falls **below** its D26 comfortable-fill `lower` bound **or above** its `upper` bound — distinct from D23's per-kind hard `max` (Zod reject, exit 2). Bands apply only to eligible body kinds (`content-text`, `content-bullets`, `content-callout`); heading/label regions have **no band** and emit **no** D26 warnings. **Precedence / dedup (D26):** where a region has a D26 per-box band, that band **supersedes** D23's footprint-blind `optimal` warning — **at most one density warning per region**. Read bands from the **catalogue** (the Setup-derived spec). This turns under/over-fill relative to the box into a checkable signal the BYO LLM / human can iterate against.

## Acceptance criteria (must be machine-checkable)

- [ ] When a region's content `< band.lower`, the CLI prints a stderr under-fill warning naming the slide + region + the band, and exits **0** → covered by `tests/density-caps.test.ts` (assert stderr text + exit 0).
- [ ] When a region's content `> band.upper`, the CLI prints a stderr over-fill warning (same shape), and exits **0** → covered by the same test file.
- [ ] Heading/label regions (`title`, `section-title`, `subtitle`, `chart-title`, `source`, `cover-body`) emit **no** D26 warnings (no band) → test asserts silence for a sparse heading.
- [ ] Where a D26 per-box band exists, D23's `optimal` warning is **not** emitted for that region (dedup) → test asserts exactly one warning per region.
- [ ] Over-`max` (D23) still rejects with exit **2**; warnings go to **stderr only**, never stdout; nothing is auto-fixed.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/cli/` / `src/pipeline/` — wherever density warnings are emitted today; add lower- and upper-bound checks against catalogue bands.
- `tests/density-caps.test.ts` (or sibling).

## Out of scope

- Band derivation (→ T-201); skill text (→ T-203).

## Risks / do-not-touch

- Do not change exit codes for validation/`max`. Never auto-truncate or "fix" (ERROR_HANDLING.md). Warnings are advisory. Do not call the band "symmetric" unless **both** per-box bounds are enforced.

## Meta

- mode: low
- depends-on: T-201
- parallel-safe: no # consumes the T-201 band
- size budget: < 300 changed lines
