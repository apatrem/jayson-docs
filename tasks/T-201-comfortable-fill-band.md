# T-201: Comfortable-fill band model + Setup deriver (D26)

<!-- Output of the Phase 6 design grill (D26). One unit of work, small enough to review. -->

## Objective

Add the **comfortable-fill band** — D26's two-sided, per-(layout, region) fill *target* — beneath D23's caps. Implement the band type in `src/schema/caps.ts`, a Setup **analytic line-model** deriver that computes each box's band from `src/setup/layout-spec.json` geometry (`x/y/w/h`, D19) + effective font size (hybrid sourcing), emit the bands into `skills/report-pptx/layout-catalogue.json` keyed by box, and a drift test keeping schema ↔ catalogue honest. Bands are **advisory only** in this task (no CLI behaviour change — that is T-202; no skill text — that is T-203).

## Acceptance criteria (must be machine-checkable)

- [ ] `src/schema/caps.ts` exposes a `ComfortableFillBand` type (`lower`/`upper` in the region's unit) documented as D26 → covered by `tests/density-caps.test.ts` (or a `comfortable-fill` sibling).
- [ ] A Setup deriver computes per-(layout, region) bands via `lines = ⌊h/(pt·1.2)⌋`, `charsPerLine = ⌊w/(pt·0.5)⌋`, `band = [~0.55,0.85]×capacity`, with hybrid font sourcing (explicit `sz` → placeholder/layout/master cascade → per-kind default from the 8/12/18/22 palette) → unit test asserts bands for ≥2 boxes of differing footprint differ correctly.
- [ ] Catalogue carries each region's band; a **drift test** asserts catalogue == deriver output (mirror of D23's drift test).
- [ ] No fill-plan that passed before now fails — Zod still rejects **only** on the per-kind `max`.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `src/schema/caps.ts` — band type (single source).
- `src/setup/` — band deriver + effective-font resolver.
- `skills/report-pptx/layout-catalogue.json` — emitted bands.
- `tests/` — deriver unit test + drift test.

## Out of scope

- CLI under-fill warning (→ T-202); skill instruction (→ T-203); any new layout (→ T-21x).

## Risks / do-not-touch

- Do **not** change D23 `max` semantics or reject behaviour. `src/setup/layout-spec.json` is read-only input — regenerate via Setup, never hand-edit (§5). Calibrate the two constants (`0.5` char-width, `[0.55,0.85]` fill) **once** against 2–3 real boxes and record the calibration.

## Meta

- mode: medium # core density-model addition; defines the band API T-202/T-203/T-211 consume (ADR-0004)
- depends-on: —
- parallel-safe: no # foundation for the rest of D26 and for the new-layout bands
- size budget: < 300 changed lines
