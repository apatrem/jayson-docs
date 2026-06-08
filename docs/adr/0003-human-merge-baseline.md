# ADR 0003 — Human-merge is the baseline; autonomous auto-merge is an earned, opt-in tier

**Status:** accepted

## Context
AI review detects only ~**15–31%** of human-flagged issues (SWE-PRBench), and agent PRs can look
clean while hiding redundancy and debt (GitHub guidance). Full auto-merge also adds machinery that
conflicts with "keep it simple." Trust in autonomy should grow on **evidence, not assumption**.

## Decision
Baseline for every repo: **protected `main` + required CI + PR + human merge.** AI review is an
**assistant — blockers-only, sparse (≤10 ranked findings)** — never a merge authority. The one
dangerous action (moving `main`) stays with a human until autonomy is earned.

The code-computed **autonomous auto-merge engine is an ADVANCED tier (ADR-0008)**, switched on
per-repo only after real CI required-checks and a Narrow→Widen rollout.

## Consequences
- The default is simple and safe.
- **Nothing from the auto-merge design is discarded, only deferred** (ADR-0008).
- "Looks right / opens cleanly" acceptance (e.g. a rendered document) is always a human-review task.
