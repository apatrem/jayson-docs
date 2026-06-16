# Architecture Decision Records

This repo **adopts the [agentic-workflow](https://github.com/apatrem/agentic-workflow)
baseline by reference** — see local **[0001](0001-adopt-agentic-workflow-baseline-by-reference.md)**.
We do **not** copy the baseline ADRs here; the workflow conventions live in the
agentic-workflow repo under the `AW-NNNN` convention (e.g. `AW-0010` = the
remediation/escalation loop) and are cited by label in `AGENTS.md`. Read them
there — that is the canonical, drift-free source.

This directory holds only this repo's **own** decisions:

- **Workflow / process** → adopted by reference; see [0001](0001-adopt-agentic-workflow-baseline-by-reference.md).
- **Domain ADRs** (jayson-docs-specific architecture decisions) → none yet; the
  local number space is free and **starts at `0002`**.
- **Product/architecture intent** (the running log of what was decided and
  rejected) lives in `docs/DECISIONS_LOG.md` (D-numbers), not here.
