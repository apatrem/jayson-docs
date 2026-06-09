# ADR 0007 — Packaging: a plugin with a central engine; per-repo is decisions + config only

**Status:** accepted

## Context
The strategy must be reusable across repos. Anything copy-pasted per repo drifts, and you lose the
ability to fix the engine once for everyone.

## Decision
Ship as a **Claude Code plugin** (conventions + role prompts + the `/agentic-workflow:*` commands + a
scaffolder), versioned centrally and riding on the external engine (ADR-0002). **Per-repo state is
only** the ADRs / `AGENTS.md` / `CONTEXT.md`, the `tasks/`, and the acceptance tests. **Zero engine
code copied per repo → no drift.** (Not a template repo, not copied scripts, not a standalone CLI —
those undermine central improvement or contradict ADR-0002.)

## Consequences
- One engine improves everywhere; repos stay independent and auditable.
- If the external engine is ever swapped, the backbone (ADR-0001) and these conventions are unaffected.
