# ADR 0010 — Post-review remediation & escalation loop (who fixes blockers, and when to re-review)

**Status:** accepted

> Derives from **agentic-workflow ADR-0010**. Tailored to this repo: it runs the **human-merge
> baseline** (ADR-0003 here, not auto-merge), and the per-tier model picks + threshold *N* live in
> this repo's `docs/MODELS.md`.

## Context

The effort/review dial (ADR-0004) defines who *implements* and who *reviews* at each tier, and the
review produces a synthesised, severity-ranked **punch-list** with a blockers-only veto. But the docs
stopped at the verdict: **who remediates the blockers, and what happens after, was never pinned.** The
re-check was only a *targeted re-verify* (hand each blocker back to its finder); there was no path for
"this remediation surfaced too many issues — re-review the whole thing," and no loop bound.

This ADR closes both gaps for the human-merge tiers: a pinned **remediator** and a bounded
**remediate → re-check → escalate** loop.

## Decision

### 1. The remediator is the tier's implementer

Remediation is **implementer-role work** (write code to satisfy an explicit spec — the punch-list), so
the cost lever of ADR-0004 holds: the **remediator is the same tier's implementer** — `low`/`medium`
→ the default cheap-fast implementer (Cursor Composer); `hard` → the **winning best-of-N lineage**.
It is a **fresh spawn on the same branch/worktree**, prompt = the synthesis punch-list ("fix exactly
this, nothing else"), same do-not-touch contracts (protected paths, frozen tests), gate-until-green,
**commit-don't-push** (the orchestrator keeps the PR boundary). The model picks live in `docs/MODELS.md`
like every other role.

### 2. Default re-check is a *targeted re-verify* (cheap, uncapped)

After remediation, hand **each blocker back to the reviewer that raised it** for an adversarial
RESOLVED / NOT-RESOLVED verdict — re-running its own reproduction, not trusting the new tests. This is
**not** a full review round and is **not** counted toward the cap. If every blocker is RESOLVED and the
gate is green → done (a human merges, ADR-0003).

### 3. Excess findings escalate one tier + trigger a full review round

If remediation surfaced *too much*, a targeted re-verify is insufficient — re-review the whole diff.
The **excess-findings trigger is a hybrid** — **any one** of:
- **count** — the synthesis blocker count ≥ a per-tier threshold *N* (objective; `docs/MODELS.md`); or
- **systemic** — the reviewers/synthesis mark the diff systemically shaky (wrong *approach*, not detail
  bugs); or
- **ballooned** — the **remediator** reports the fix had to touch far beyond the punch-list.

When it fires: **escalate the tier one step** (`low→medium→hard`) **and** run a **full fresh review
round** at the new tier on the remediated diff (a complete tier review producing a new synthesis), not
a targeted re-verify.

### 4. Escalation keeps the diff — `hard` seeds best-of-N from it

Escalation raises **review** scrutiny without discarding work:
- **`low→medium`** — add the cross-lineage **dual** review to the same remediated diff, **in the same
  workspace/branch** (no new worktree — just spawn the extra reviewer per §2).
- **`medium→hard`** — **do not discard the diff.** The medium diff was authored (and remediated) by the
  **cursor** implementer, so it is already the cursor best-of-N candidate: treat it as **seed candidate
  #0** (it stays in its existing workspace/branch). Spawn the **other** `hard` author — **codex** — as a
  **new workspace/branch in parallel** (best-of-N is **two lineages**; `docs/MODELS.md`), then
  **smart-merge {seed + the codex attempt}** via the **codex** synthesizer onto one chosen branch. Review
  that branch with the cross-lineage dual, **Opus 4.8 as the structurally-clean lens** (claude held out
  of authoring/synthesis) plus the optional Fable third. This preserves `hard`'s authoring step, honours
  the work already done, **and** satisfies the independence invariant (ADR-0004; `docs/MODELS.md`).

### 5. Bound: 3 full review rounds, then `needs-human`

The loop is capped at **3 full review rounds**, where **round 1 = the initial tier review** and only
full tier re-reviews count (targeted re-verifies are free and uncapped). So there are **at most two
escalated re-reviews** on top of the initial review. If blockers survive the third round, the
orchestrator **stops auto-looping** and routes to **`needs-human`** (ADR-0006): hand the PR to the human
merging with the open blockers flagged. A human is already the merge gate here (ADR-0003), so this is a
cost ceiling, not a loss of safety.

## Consequences

- **A new pinned role.** `docs/MODELS.md` carries a **remediator** row (= the tier's implementer). Swap
  it there, like every other model pick.
- **Bounded cost, predictable worst case.** ≤ 2 escalated full re-reviews + uncapped cheap re-verifies;
  the expensive path (`medium→hard` seeding) only fires on genuinely shaky diffs.
- **Relation to the other ADRs.** Terminal routing is ADR-0006 (`needs-human`, never to `main`); the
  human merge gate is ADR-0003. The tier ladder, the `hard ⊇ medium` invariant, and the **mode-is-a-
  floor** proactive escalation are ADR-0004; this loop escalates *reactively* on findings, that one
  escalates *proactively* on surface. The per-tier threshold *N* and all model picks live in
  `docs/MODELS.md`.
- **Terminology.** Canonical term is **remediation / remediate**.
