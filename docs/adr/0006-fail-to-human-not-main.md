# ADR 0006 — Fail to human, never to main; sandboxed workers

**Status:** accepted

## Context
A loop running agents over many tasks is undefined without explicit behavior for errors and
exhaustion. Governing principle: **fail to human, never to `main`.** The worst outcome of a bad run
is a review pile, never a broken `main`.

## Decision
- Worker errors / no diff → proceed with whoever succeeded (≥1 candidate). **Zero → `needs-human`.**
- A blocked or failing task routes to a **`needs-human` PR**; **CI is the source of truth** (one
  auto-rerun for flake).
- **Workers run sandboxed: no network, no secrets, no push** — safety and a runaway-token backstop.
- A human-flagged task does **not** halt the queue, but **downstream dependents of an unmerged task
  are skipped**.

## Consequences
- The loop degrades into open PRs, not failures.
- The detailed quota / queue / repair semantics for the unattended auto-merge loop live in the
  advanced tier (ADR-0008).
