# ADR 0005 — Three phases; humans gate planning; competition only in implementation

**Status:** accepted

## Context
Safety is *manufactured upstream*. ADRs become the protected contracts; the plan produces the tasks,
risk tiers, protected-path list, and acceptance tests. You fan out *implementation* against a frozen
spec; you do **not** fan out the spec.

## Decision
- **Phase 1 — Architect:** single agent + human, interactive (`grill-with-docs`; `grill-me` when there
  is no domain model yet) → `docs/adr/*` and `AGENTS.md` (with `CONTEXT.md` for domain language).
  **The human signs each ADR**; the ADRs define
  the protected contracts, recorded in `AGENTS.md`'s forbidden/protected section.
- **Phase 2 — Plan:** single agent + human → `tasks/*.md`, each with acceptance tests, `risk`,
  `mode`, `depends-on`. **The human sign-off here is the primary control point.**
- **Phase 3 — Run:** the only phase that fans out and the only phase that touches `main` (via PR).

## Consequences
- Cheap, high-leverage human judgment is concentrated where it matters; the loop runs autonomously after.
- Competition is reserved for implementation, where diversity pays and a gate exists one level up.
- Three agents writing three architectures (no gate above them) is explicitly rejected.
