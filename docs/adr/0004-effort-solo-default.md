# ADR 0004 — Effort/review dial: three tiers (`mode: low | medium | hard`), default `low`

**Status:** accepted — supersedes the original two-point dial (`mode: solo | competitive`)

> Derives from **agentic-workflow ADR-0004** (the floor + model-policy updates below mirror its
> 2026-06-15 and 2026-06-11 updates).

> **Update (2026-06-15) — the declared `mode` is a *floor*, and risk can raise it.** The author's
> `mode` sets a minimum, not a ceiling: a task whose change touches **protected/destructive surface**
> runs at **≥ `medium`** regardless of what the frontmatter declares. The trigger list is the
> "Forbidden / protected" surface — here it *raises the review tier* rather than blocking outright:
> - destructive filesystem ops — `rm -rf`, in-place rewrites, symlink/dir replacement
> - the gate or CI config itself (`pnpm run build|lint|test|validate`, `.github/workflows/`)
> - lockfiles / dependency manifests (`package.json`, `pnpm-lock.yaml`)
> - migrations · schema · data-shape changes (the Zod layout schemas, `layout-spec.json`)
> - auth · secrets · security boundaries
> - public API / contract changes (the CLI surface, fill-plan contract)
>
> The planner/orchestrator checks the task's *files-likely-involved* + acceptance against this list at
> plan and at run-start; on intersection it **bumps the tier** (low→medium; medium→hard if the change is
> also large or ambiguous) and records *"escalated by risk floor"* in the task and PR. **Why:** destructive
> surface is medium-risk *by nature*, and the right tier shouldn't depend on the author noticing. This
> makes the escalation **structural**, not a matter of judgement, and it composes with the post-review
> remediation/escalation loop (ADR-0010, this repo), which escalates *after* findings; this escalates
> *before*, on surface. See refinement 3 below.

> **Update (2026-06-11) — model picks moved to a living table; Fable-first retired.** Supersedes the
> 2026-06-10 Fable-first update below. The *specific model→role→tier picks* now live in **`docs/MODELS.md`**
> (a dated table, revisited often against cursor.com/cursorbench + deepswe.datacurve.ai). This ADR keeps
> only the durable **principle**:
> - **Role-keyed cost ladder.** The **implementer** is the cost lever (cheap-fast by default; a premium
>   author appears only inside `hard`'s best-of-N). Orchestrator, reviewers, and synthesizer are low-volume
>   and quality-critical → premium, **reproducible** models. **Fable is no longer the default** — dropped
>   for rate-limit fragility (a Fable reviewer stalled a PR mid-review), not to save tokens. **Opus 4.8 is
>   the reliable Claude-lineage premium**; Fable 5 survives only as the optional `hard` third lens.
> - **Reviewers are cross-lineage *and* independent of the implementer** (not just reviewer-vs-reviewer).
>   With three lineages, the reviewer(s) are the lineage(s) the implementer didn't use.
> - **`hard` guarantees ≥1 structurally-clean lens** — at least one reviewer whose **lineage neither
>   authored nor synthesized**. Because a 3-lineage best-of-N would leave no clean lineage, **`hard` caps
>   best-of-N at two lineages and reserves the third entirely for review**. This holds *by construction*
>   and survives the loss of any optional extra lens. The cost is one fewer competing author.
> - **"Difficult" promotes to `hard`** — no separate "stronger single implementer" knob.
> - **`hard ⊇ medium` preserved** — `hard`'s review is still a cross-lineage dual (at least the medium
>   scrutiny), now with the guarantee that one lens is structurally clean.
> Concrete current models are in **`docs/MODELS.md`**; the prose below points there rather than naming models.

> **Update (2026-06-10 — SUPERSEDED by the 2026-06-11 update above) — Claude-lineage model policy:
> Fable-first, pinned by CLI flags.** All Claude-lineage roles ran **Claude Fable 5**, pinned per spawn
> via `claude --model claude-fable-5 --effort <level>` (the `ultrathink` prompt-prefix trick is retired —
> effort is a first-class CLI flag, valid values `low|medium|high|xhigh|max`). Retained here only as
> history; the current policy is the 2026-06-11 update above + `docs/MODELS.md`.

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
| **hard** | **competitive best-of-N** over **2 lineages** → **smart-merge** into one diff | the **medium** cross-lineage dual review, run on the synthesized result, with **≥1 structurally-clean lens** |

The declared `mode` is a **floor**: protected/destructive surface forces **≥ medium** regardless (refinement 3).

- **low (default)** — today's baseline: one implementer + the deterministic gate + one adversarial
  reviewer. The routine ~90% path.
- **medium** — one implementer + gate, then a **dual review on every PR**: two independent reviewers of
  **different lineage**, each independent of the implementer, each post a PR comment (current models in
  **`docs/MODELS.md`**).

  The orchestrator then **synthesizes both** into one verdict: agreements, disagreements, and a
  deduped, severity-ranked punch-list. **Veto is blockers-only** (correctness / security /
  spec-violation / regression); nits are advisory follow-ups. Mechanics: `/agentic-workflow:review`.
- **hard** — competitive best-of-N over **two lineages**: agents implement the **same** task in isolated
  worktrees, then a **smart-merge** synthesizer grafts the best of the attempts into one diff — and
  **then the cross-lineage dual review runs on that synthesized result**, with the guarantee that **one
  lens is structurally clean** (its lineage neither authored nor synthesized). The third lineage is held
  out of authoring/synthesis precisely to *be* that clean lens (current assignment + rationale in
  **`docs/MODELS.md`**; this is how `hard ⊇ medium` *and* the independence invariant both hold).

### Refinements (load-bearing — do not drop)
1. **`hard` ⊇ `medium`, with a structurally-clean lens.** The synthesized winner of a `hard` run still
   gets a **cross-lineage dual review** — at least the **medium** scrutiny — and the invariant adds that
   **≥1 reviewer is fully independent** (lineage neither authored nor synthesized). A `hard` task must
   never receive *less* scrutiny than a `medium` one; smart-merge adds an authoring step on top of
   medium's review, it does not replace it. (Achieved by capping best-of-N at two lineages —
   `docs/MODELS.md`.)
2. **smart-merge ≠ auto-merge.** "Smart merge" means *synthesizing N attempts into one best diff* — an
   **authoring** step. The PR **merge** stays **human by default** (ADR-0003). Bypassing the human
   merge gate is the **separate, opt-in advanced tier** (ADR-0008), **orthogonal** to this effort dial.
   Choosing `mode: hard` does **not** imply auto-merge.
3. **`mode` is a floor; risk raises it.** *(added 2026-06-15 — see Update above)* The declared tier is a
   **minimum the author sets**, never a ceiling. A change touching protected/destructive surface
   (`rm -rf`/in-place rewrites, the gate/CI, lockfiles/deps, migrations/schema, auth/secrets, public
   API/contracts) is forced to **≥ `medium`** — *"prefer low, justify higher"* still holds, but some
   surfaces remove the option of staying low. Distinct from ADR-0010 (this repo): that loop escalates
   *reactively* on excess findings; this escalates *proactively* on the surface the diff touches.

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
  CLIs (pinned models/effort in **`docs/MODELS.md`**; see `/agentic-workflow:review`); a human still
  merges by default.
