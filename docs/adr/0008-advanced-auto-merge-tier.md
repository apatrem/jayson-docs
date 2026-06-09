# ADR 0008 — Advanced tier (optional, earned): the autonomous auto-merge engine

**Status:** accepted — **optional / advanced; OFF by default** (baseline is human-merge, ADR-0003)

## Context
Once a repo's gate and judge are trusted *on evidence*, the human merge step can be automated for
the safest slice of changes. This tier is **deferred, not discarded**: everything below is inert
until a repo explicitly opts in, after real CI required-checks and a graduated rollout. It is
recorded here in full so the design is preserved and ready, not reinvented.

**Orthogonal to the effort dial (ADR-0004).** This ADR governs the *one dangerous action* — moving
`main` — not how much effort a task spends authoring/reviewing. The effort tier (`low | medium | hard`)
and the auto-merge tier are **independent knobs**: a `hard` task's **smart-merge** (an Opus synthesizer
grafting N attempts into one diff — an *authoring* step) produces a PR that, **by default, a human still
merges** (ADR-0003). **smart-merge ≠ auto-merge.** Auto-merge below is what a repo *separately* opts into;
it can then apply to any effort tier whose result clears the code-computed checks.

## Decision — when (and only when) a repo opts in

**Frozen acceptance gate.** Acceptance tests are authored in Phase 2 and **committed to `main`
before any agent runs**, and **frozen**: agents may *add* tests but may not weaken or delete the
frozen set; the engine verifies the frozen files are byte-intact before trusting a green result. The
frozen suite is the **only** thing that gates auto-merge; agent-added tests are informational signal.
*Corollary:* any task whose acceptance cannot be expressed as a runnable test is `risk: high` and is
**never** auto-merge eligible — it routes to a human by definition.

**The auto-merge decision is code.** Auto-merge **iff all** hold, else open a `needs-human` PR —
computed by **plain code, never an LLM call** (the LLM emits structured findings; code decides):
1. frozen gate green, 2. reviewer returns no blocker, 3. no **protected path** touched,
4. within **diff budget** (runaway detector), 5. task `risk: low`. Protected paths lock the
**contracts and the gate itself** so an agent can't weaken its own judge.

**Synthesis + cross-lineage review (the `hard` tier's mechanics — ADR-0004).** For best-of-N, the
**smart-merge synthesizer (Opus 4.8, extra-high)** grafts the best of the N attempts into one final
diff. That synthesized result then gets the **medium dual review** (`hard` ⊇ `medium`): two independent,
cross-lineage skeptics — **GPT-5.5 at `xhigh`** and **Opus 4.8 at extra-high/ultrathink** — each post a
PR comment, and the orchestrator synthesizes both (`/agentic-workflow:review`). Reviewer veto is
**blockers-only** (correctness / security / spec-violation / regression); nits are non-blocking
follow-ups. A cheap pre-screen (Cursor) can kill obvious breakage first. Synthesis is an *authoring*
step (**smart-merge ≠ auto-merge**); whether the resulting PR auto-merges is the orthogonal decision below.

**Failure / queue / quota.** Synthesis fails the gate or reviewer raises a blocker → **repair once**
(feed the failure back), then `needs-human`. **Worker** rate-limited → degrade and continue;
**reviewer** rate-limited → that task `needs-human`; **synthesizer (Opus)** rate-limited → **pause
the queue at a resumable checkpoint** and notify. **Sequential** queue by default (each task starts
from the new `main`); opt-in parallel only for `parallel-safe` tasks with disjoint file sets. Near
the token budget, auto-downgrade remaining tasks down the effort ladder (`hard`→`medium`→`low`).

**Rollout ladder — earn the right to touch `main`. Narrow → Widen → Unattended.**
1. *Narrow:* auto-merge only the safest slice (`mode: low` · `risk: low` · additive/non-protected · tiny diff).
2. *Widen:* raise the diff budget, enable auto-merge for `medium`/`hard` results, open the non-protected path set.
3. *Unattended:* overnight queue; wake to merged low-risk PRs + a `needs-human` pile.

Non-negotiables: **squash-merge + an `auto-merged` label** for easy bulk rollback; **ratchet back
and tighten the gate if a bad change ever lands.**

## Consequences
- The full autonomous design is preserved intact and available, but **quarantined behind an explicit
  opt-in**; turning it on is a deliberate graduation, not a default.
- Trust in autonomy grows on evidence, not assumption.
- **Engine note:** Superset (ADR-0002 Update) exposes a **headless CLI/SDK** — worker spawn is
  `superset workspaces create … --agent … --prompt …`, and the gate runs via
  `superset terminals create --command <gate>` — so the spawn/gate primitives this tier needs already exist.
  What remains is *this* ADR's code-side decision + `gh` merge; the engine is no longer the blocker.
