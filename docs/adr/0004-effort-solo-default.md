# ADR 0004 — Effort/review dial: three tiers (`mode: low | medium | hard`), default `low`

**Status:** accepted — supersedes the original two-point dial (`mode: solo | competitive`)

> **Update (2026-06-10) — Claude-lineage model policy: Fable-first, pinned by CLI flags** (mirrors the
> agentic-workflow ADR-0004 Update). All Claude-lineage roles run **Claude Fable 5**, pinned per spawn
> via `claude --model claude-fable-5 --effort <level>` (the `ultrathink` prompt-prefix trick is retired —
> effort is a first-class CLI flag, valid values `low|medium|high|xhigh|max`). **Fallback:** if Fable is
> unavailable/rate-limited, use the **latest Opus (≥4.8) at `high`–`xhigh`** and record the actual model
> in the review comment. The decision text below is updated in place to match.

## Context
With several capable, *heterogeneous* agents (Claude, Codex, Cursor), two orchestration shapes
exist: collaborative (split one task across agents, integrate) or competitive (all solve the same
task, keep the best). Heterogeneity only pays when approaches diverge — i.e. competitively; a real
run confirmed the three produce meaningfully different solutions (one won on rigor, another on API
design, another on size). But running N agents on *every* task costs ~N× and is wasted on routine work.

The original dial had two points (`solo | competitive`). In practice there is a useful middle: keep a
single implementer, but spend extra **review** assurance on a change that is risky but not worth a
full competitive author-off. So the dial really moves **two axes at once** — *authoring depth* (how
many lineages implement) and *review rigor* (how hard the result is scrutinised) — and we bundle both
into one named tier so a task author turns a single knob.

## Decision
Effort is a **per-task dial, `mode: low | medium | hard`, default `low`**, set in the task
frontmatter (`tasks/*.md`), defaulting to `low`. It is a cost↔assurance
ladder; the rule is **prefer `low`, justify higher** — promote a task only when its risk/ambiguity/value
warrants the extra spend, and say why in the task.

The two axes bundled into the one dial:

| `mode` | Authoring depth | Review rigor |
|--------|-----------------|--------------|
| **low** *(default)* | 1 implementer | deterministic gate + **1 adversarial reviewer** |
| **medium** | 1 implementer | deterministic gate + an independent **dual review** on every PR |
| **hard** | **competitive best-of-N** across lineages → **smart-merge** into one diff | the **medium** dual review, run on the synthesized result |

- **low (default)** — today's baseline: one implementer + the deterministic gate + one adversarial
  reviewer. The routine ~90% path.
- **medium** — one implementer + gate, then a **dual review on every PR**: two independent reviewers of
  different lineage each post a PR comment —
  - **GPT-5.5 at `xhigh`** via the **codex** CLI (effort comes from `~/.codex/config.toml` `model_reasoning_effort = "xhigh"`), and
  - **Claude Fable 5 at effort `high`** via the **claude** CLI (`--model claude-fable-5 --effort high`).

  The orchestrator then **synthesizes both** into one verdict: agreements, disagreements, and a
  deduped, severity-ranked punch-list. **Veto is blockers-only** (correctness / security /
  spec-violation / regression); nits are advisory follow-ups. Mechanics: `/agentic-workflow:review`.
- **hard** — competitive best-of-N: N agents implement the **same** task in isolated worktrees across
  lineages (Claude / Codex / Cursor — the claude worker at **Fable 5, effort `high`**), then a **smart
  merge** — a **Fable 5 effort-`xhigh` synthesizer** grafts the best of the attempts into one diff — and
  **then the medium dual review runs on that synthesized result**.

### Two refinements (load-bearing — do not drop)
1. **`hard` ⊇ `medium`.** The synthesized winner of a `hard` run still gets the **full GPT-5.5 + Fable
   dual review**. A `hard` task must never receive *less* scrutiny than a `medium` one; smart-merge
   adds an authoring step on top of medium's review, it does not replace it.
2. **smart-merge ≠ auto-merge.** "Smart merge" means *synthesizing N attempts into one best diff* — an
   **authoring** step. The PR **merge** stays **human by default** (ADR-0003). Bypassing the human
   merge gate is the **separate, opt-in advanced tier** (ADR-0008), **orthogonal** to this effort dial.
   Choosing `mode: hard` does **not** imply auto-merge.

**Collaborative split is still rejected:** three contracts with nothing to integrate them against, and
it wastes the vendor diversity.

## Consequences
- Cost tracks value on a real ladder: cheap routine work at `low`; extra *review* assurance at
  `medium` without paying for N authors; full author-off + dual review at `hard`.
- One knob, two axes: a task author picks a tier instead of reasoning about authoring and review
  separately.
- The effort dial and the auto-merge tier (ADR-0008) are independent: any tier can run under the
  human-merge baseline (ADR-0003) or, once a repo has earned it, under auto-merge.
- Under Superset, `hard`'s best-of-N runs as N parallel sessions and the dual review runs the reviewer
  CLIs (see `/agentic-workflow:review` for the pinned models/effort); a human still merges by default.
