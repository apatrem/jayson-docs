# ADR 0001 — Adopt the agentic-workflow baseline by reference (retire the copied ADRs)

**Status:** accepted
**Date:** 2026-06-15

**Supersedes:** the local byte-for-byte copies formerly at `docs/adr/0001–0009`
(the agentic-workflow baseline ADRs, copied into this repo). Those nine files are
deleted by this change; their content is **not** re-hosted here — it is adopted by
reference (below).

## Context

This repo carried the agentic-workflow baseline ADRs as **local copies** of
`docs/adr/0001–0009`. That was adopt-**by-copy**: it burned this repo's ADR
number space on process decisions owned elsewhere, and the copies drifted — some
already carried stale model-policy text the baseline had since retired (it named a
default Claude-lineage model the living `docs/MODELS.md` no longer uses).
The canonical baseline (`apatrem/agentic-workflow`, `docs/adr/`) explicitly says
consuming repos must adopt it **by reference, not by copy**: cite the baseline
conventions by their `AW-NNNN` labels, keep your own `docs/adr/` for *domain*
decisions in your own number space, and never re-host a baseline ADR file
(rationale: **AW-0007**). jayson-editor already adopts it this way.

## Decision

This repo, **jayson-docs, adopts the agentic-workflow baseline by reference.**
The canonical source for every baseline process decision is the **agentic-workflow
repo** (`docs/adr/`), under the `AW-NNNN` convention. This repo does **not** copy
those ADRs; where a baseline convention applies, we cite its `AW-NNNN` label
(primarily in `AGENTS.md`).

The adopted baseline (one-line gloss each; read the canonical text under
`AW-NNNN`):

- **AW-0001** — the backbone is `AGENTS.md` + tests/CI + git/PR, not the orchestrator.
- **AW-0002** — buy the engine, build the conventions; the engine here is **Superset** (workers in isolated git worktrees).
- **AW-0003** — human-merge is the baseline; auto-merge is an earned, opt-in tier (a human merges, never the agent).
- **AW-0004** — effort/review dial: three tiers (`low | medium | hard`), default `low`; the declared `mode` is a **floor** that protected/destructive surface raises.
- **AW-0005** — three phases; humans gate planning; competition only in implementation.
- **AW-0006** — fail to a human, never to `main`; sandboxed workers (`needs-human`).
- **AW-0007** — packaging: a plugin with a central engine, **portable across CLIs (Claude Code, Cursor, Codex)**; per-repo is decisions + config only, and the pack's **process skills are delivered globally by the plugin, never vendored** into a consuming repo. (This ADR exists because of AW-0007 — adopt by reference, not copy.)
- **AW-0008** — the optional advanced auto-merge tier; **off by default** here.
- **AW-0009** — package manager: pnpm via Corepack. (This repo's pnpm migration *fact* lives in `AGENTS.md`; the *convention* is AW-0009.)
- **AW-0010** — post-review remediation & escalation loop: the remediator is the tier's implementer; excess findings escalate a tier + re-review; capped at 3 rounds → `needs-human`.
- **AW-0011** — minimalism review lens + the `// SHORTCUT(<ceiling>): <upgrade path>` marker convention (advisory, reviewer-enforced; the code is the ledger).

**Model policy follows AW-0004 + the baseline `docs/MODELS.md` by reference.**
This repo keeps **no local `MODELS.md`** — the living model→role→tier table is the
baseline's, revisited there; the durable principle is AW-0004. (jayson-editor is
the same: no local MODELS.md.)

`agentic-workflow-baseline: v0.3.7` — the agentic-workflow **pack version** adopted
(covering AW-0001…AW-0011). Bump it when this repo resyncs to a newer pack release.

## Consequences

- The nine copied baseline ADRs are gone; nothing in this repo drifts from the
  baseline because nothing re-hosts it. To learn a convention, read it under its
  `AW-NNNN` in the agentic-workflow repo.
- This repo's local ADR **number space is now free for *domain* ADRs starting at
  `0002`.** jayson-docs has no domain ADRs yet; product/architecture intent still
  lives in `docs/DECISIONS_LOG.md` (D-numbers).
- `AGENTS.md` cites baseline conventions by `AW-NNNN` instead of carrying local
  copies; model picks are by reference (AW-0004 + baseline `docs/MODELS.md`), so
  there is no inline model policy to drift.
- The pack's **process skills** (`/agentic-workflow:review`, `:run`, …) come from the
  globally-installed plugin (AW-0007) — this repo vendors **none**. The local
  `skills/` folder is the **product deliverable** (BYO-LLM playbooks; `docs/DECISIONS_LOG.md`
  D6/D15), not pack skills, and stays.
