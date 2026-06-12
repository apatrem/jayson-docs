# T-203: Surface the fill-band in the catalogue + report-pptx skill (D26)

<!-- Output of the Phase 6 design grill (D26). One unit of work, small enough to review. -->

## Objective

Make the comfortable-fill band usable by the BYO LLM. Update `skills/report-pptx/SKILL.md` to instruct the LLM to **read each region's fill-band and pick the layout whose band best matches the content volume** ("match content volume to a layout's fill-band"), and document the band as the D26 third tier in `docs/SLIDE_LAYOUT_LIBRARY.md`. State **explicitly** that font size stays master-canonical and is never chosen at runtime (closes the "ask the font size" idea — D26 / §1).

## Acceptance criteria (must be machine-checkable)

- [ ] SKILL.md §2/§4 instruct reading the per-region fill-band and selecting the layout by content-volume fit; an explicit line states fonts are master-canonical and never chosen.
- [ ] `docs/SLIDE_LAYOUT_LIBRARY.md` density section documents the band as the D26 tier above `optimal`/`max`.
- [ ] No CLI/schema behaviour change.
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved

- `skills/report-pptx/SKILL.md`
- `docs/SLIDE_LAYOUT_LIBRARY.md`
- `skills/report-pptx/layout-catalogue.json` (presentation only, if needed)

## Out of scope

- Deriver (→ T-201); CLI warn (→ T-202).

## Risks / do-not-touch

- Do not contradict §1 hard rules (no font/coords choice; reject-don't-fix).

## Meta

- mode: low
- depends-on: T-201
- parallel-safe: yes # docs/skill text, after T-201 lands the bands
- size budget: < 300 changed lines
