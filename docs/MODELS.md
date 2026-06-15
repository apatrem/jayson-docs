# MODELS.md — agent model picks (living table)

> Mirrors **agentic-workflow `docs/MODELS.md`** (policy as of 2026-06-11). This is the **single source for
> which model runs which role** in this repo; the *durable principle* behind it (role-keyed cost ladder;
> reviewers cross-lineage **and** independent of the implementer; "difficult" → `hard`; `hard ⊇ medium`)
> lives in **`docs/adr/0004-effort-solo-default.md`** and rarely changes.

**Last reviewed: 2026-06-11.** Revisit **often** — whenever a vendor ships a new tier or the leaderboards
below move.

> **To swap a model, edit THIS file only.** `AGENTS.md`, `docs/WORKFLOW.md`, `ROLES.md`, and the review
> skill point here instead of naming models, so the policy churns in one place.

**Quality/price check — revisit these when picking models:**
- https://cursor.com/cursorbench
- https://deepswe.datacurve.ai/

## Roles × tiers (as of 2026-06-11)

| tier | implementer(s) | reviewer(s) — cross-lineage, independent of the implementer | synthesis / smart-merge |
|------|----------------|-------------------------------------------------------------|-------------------------|
| **low** | Composer 2.5 fast *(cursor)* | **GPT-5.5 @ High** *(codex)* — single | — |
| **medium** | Composer 2.5 fast *(cursor)* | **GPT-5.5 @ xHigh** *(codex)* + **Opus 4.8 @ xHigh** *(claude)* | — |
| **hard** | best-of-N over **2 lineages**: Composer 2.5 fast *(cursor)* + GPT-5.5 @ xHigh *(codex)* | **Opus 4.8 @ xHigh** *(claude)* — **structurally clean** *(always)* + **GPT-5.5 @ xHigh** *(codex)* + **Fable 5 @ High** *(claude, optional 3rd)* | **GPT-5.5 @ xHigh** *(codex)* |

**Orchestrator** (drives `/run`, `/review`, synthesizes the review verdict) = **Claude Opus 4.8 [1M] @ High**.
**At `hard` the orchestrator does *not* perform the smart-merge itself** — that is delegated to a spawned
**codex** synthesizer (above), so the **claude** lineage neither authors nor synthesizes and stays the
structurally-clean reviewer (see the invariant below). The orchestrator coordinating the run (spawning,
gating, opening the PR, synthesizing *review comments*) is not code-authoring and does not taint that
cleanliness.

**Remediator** (fixes review blockers — ADR-0010) = **the tier's implementer**: `low`/`medium` →
Composer 2.5 fast *(cursor)*; `hard` → the **winning best-of-N lineage**. Fresh spawn on the same branch,
prompt = the synthesis punch-list, commit-don't-push.

**Excess-findings threshold *N*** (blocker count that escalates a tier + forces a full re-review —
ADR-0010 §3): **low: 3 · medium: 4 · hard: 5** *(tune with experience; the `systemic` and `ballooned`
judgment triggers fire regardless of count)*.

### Why these (the trade-offs)
- **Implementer is the cost lever** (it writes all the code, on every task) → cheap-fast **Composer 2.5**
  by default; a premium author shows up only inside `hard`'s best-of-N. **"Difficult" promotes a task to
  `hard`** — there is no separate "stronger single implementer" knob (ADR-0004).
- **Orchestrator / reviewers / synthesizer are low-volume and quality-critical** → premium,
  **reproducible** models. We dropped **Fable as the default** for its rate-limit fragility (a Fable
  reviewer stalled a PR mid-review), not to save tokens; **Opus 4.8 [1M] is the reliable Claude-lineage
  premium**.
- **Every reviewer is cross-lineage AND independent of the implementer.** At `low`/`medium` (one cursor
  implementer) both other lineages are free, so every reviewer is fully clean. At `hard` this is
  *guaranteed by construction* — see the invariant below.

### `hard` independence — the invariant (≥1 structurally-clean lens)
**Invariant (ADR-0004): `hard` always has ≥1 reviewer whose lineage neither authored nor synthesized.**
We buy this by **capping best-of-N at two lineages** (cursor + codex) and **reserving the third (claude)
entirely for review** — claude does not author and does not run the smart-merge (the **codex** synthesizer
does). So **Opus 4.8 (claude) is structurally clean**, and it stays clean even if the optional Fable lens
is unavailable. This is the deliberate trade: **one fewer competing author** (best-of-2, not best-of-3)
**in exchange for a guaranteed independent lens** that survives degradation.

- **Why GPT synthesizes, not Opus.** The clean lens must be a lineage that didn't touch the code; if Opus
  (claude) ran the smart-merge it would be tainted. So at `hard` the **codex** lineage does the smart-merge
  — codex both authors one best-of-N attempt *and* synthesizes (mild self-judging), which the clean Opus
  lens is positioned to catch.
- **`hard ⊇ medium`.** The review is still a cross-lineage dual (Opus + GPT) — at least the **medium**
  scrutiny — with the structural guarantee that **Opus is the clean one**; GPT is cross-lineage but
  authored/synthesized. **Fable 5 @ High** is an optional third lens (also claude-lineage,
  instance-independent); if it stalls, `hard` does **not** lose its clean lens (Opus already provides it).

### Effort & pinning mechanics
- **Claude** (orchestrator/reviewer/implementer/synth): CLI flags `--model <id> --effort <low|medium|high|xhigh|max>`.
  IDs: Opus 4.8 = `claude-opus-4-8` (1M context: `claude-opus-4-8[1M]`); Fable 5 = `claude-fable-5`. The
  retired `ultrathink` prompt-prefix trick is **never** used — effort is a first-class flag.
- **codex (GPT-5.5):** effort is read from `~/.codex/config.toml` → `model_reasoning_effort` (global, not
  a per-call flag). Note the per-tier split — **High** at `low`, **xHigh** at `medium`/`hard`.
- **Cursor (Composer 2.5):** "fast" tier via `cursor-agent`.

## Note for this repo
The orchestrator role stays `claude-code` (ADR-0002 Update); a human merges (ADR-0003) — none of the tiers
here auto-merge. `hard`-tier authoring biases per lineage live in `ROLES.md`.
