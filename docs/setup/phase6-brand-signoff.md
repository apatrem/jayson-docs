# Phase 6 — D27 archetype brand sign-off

Status: **PENDING human sign-off.** The 24 new archetype layouts (T-211) were authored
to the master's existing theme (Futura Medium / Arial, the `schemeClr` accent palette,
the 8/12/18/22 type scale) — **no invented styling**. They were authored programmatically
(python-pptx harness) because no headless renderer is available here; this checklist is the
brand sign-off gate and must be completed in PowerPoint by a human reviewer.

## New layouts (24)

| Family | layoutIds | Notes |
|--------|-----------|-------|
| Big number | `big-number` | hero stat + caption |
| Process | `process-3/4/5` | pentagon-start + chevrons + numbered badges |
| KPI | `kpi-3/4/5` | divider-bar stat columns |
| Funnel | `funnel-3/4/5` | **SYNTHETIC** — zero corpus reference (no deck used a funnel) |
| Feature grid | `feature-grid-3/4/5` | coloured header bar + body |
| Roadmap | `roadmap-3/4/5` | timeline rule + numbered phase markers |
| Value chain | `value-chain` | source → 5 stages → customer + narrative |
| Gantt | `gantt` | time-grid header + 4 workstream lanes |
| Matrix | `matrix-2x2`, `matrix-9box` | labelled axes + quadrant/cell content |
| Quote | `quote` | full-slide pull-quote + attribution |
| Tables | `table-rag`, `table-comparison`, `table-generic` | real PowerPoint table; fill mechanism is T-210/T-213 |

## Visual-diff checklist (tick after reviewing each in PowerPoint, slides 27–50)

- [ ] **Theme fidelity** — every new slide uses only theme colours (accent green/blue/amber, charcoal text) and Futura/Arial. No off-palette colour or font.
- [ ] **Type scale** — headings/labels/body sit on the 8/12/18/22 scale; nothing arbitrarily sized (big-number hero excepted — confirm the hero size is acceptable).
- [ ] **Chrome parity** — title, source, and page-number footer match the existing 26 layouts' positions.
- [ ] **N-up alignment** — process/kpi/funnel/feature-grid/roadmap columns are evenly pitched and aligned across the -3/-4/-5 variants.
- [ ] **Process/value-chain** — pentagon-start + chevron sequence reads left-to-right; numbered badges legible.
- [ ] **Matrix** — axes labelled, quadrants/cells balanced; 9-box grid even.
- [ ] **Tables** — header band + grid read as a real table; column widths sensible.
- [ ] **Spacing/overflow** — no shape overlaps, off-slide elements, or text clipping at sample lengths.

## Items explicitly flagged for the brand owner

- [ ] **Funnel is synthetic.** No deck in the reference corpus used a funnel; the `funnel-3/4/5` design (horizontal narrowing trapezoid bars) has no real precedent. Confirm or redesign.
- [ ] **No RAG-red in the theme.** The brand palette has green (accent2) and amber (accent5) but **no red**. `table-rag` status cells currently cycle green/amber/grey. Decide whether to add a brand RAG-red token (the status-enum + colours are formalised in T-213a).
- [ ] **`matrix-9box`** was the optional variant — confirm it should ship.

## Sign-off

- Reviewer: _______________  Date: _________
- Decision: ☐ Approved ☐ Approved with changes (listed above) ☐ Rejected
