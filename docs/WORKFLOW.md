# Agentic coding workflow (one page)

**Backbone (this repo):** `AGENTS.md` (cross-tool source of truth) + a deterministic gate (build/lint/test/validate) enforced by **CI required checks** on a **protected main** + small **PRs**.
*LLMs propose. Tools verify. Git isolates. CI decides. Humans merge. Rules remember.*

Product/architecture decisions live in `docs/DECISIONS_LOG.md`. The process/orchestration conventions are the **agentic-workflow baseline, adopted by reference** (AW-0001…AW-0011; see `docs/adr/0001-adopt-agentic-workflow-baseline-by-reference.md`) — cited below by their `AW-NNNN` labels.

## The loop
idea → **`/agentic-workflow:architect`** (grill-with-docs → ADRs + `CONTEXT.md`; human signs each ADR) → **`/agentic-workflow:plan`** (`tasks/T-xxx.md` + frozen red tests; human sign-off) → *(codegraph maps blast radius)* → **`/agentic-workflow:run`** (implement in an isolated worktree) → gate green → small PR → review per tier (blockers only; `medium`/`hard` add the dual review) → **human merges** → recurring mistake → a test/lint/rule.

## Effort/review dial — `mode: low | medium | hard` (default `low`; prefer low, justify higher)
One dial, two axes (authoring depth × review rigor); set per task, default `low` (AW-0004). The declared `mode` is a **floor** — protected/destructive surface (`rm -rf`/in-place rewrites, gate/CI, lockfiles/deps, migrations/schema, auth/secrets, public APIs) forces **≥ medium** regardless (AW-0004).
- **low** *(default, ~90%)* — 1 implementer + deterministic gate + 1 adversarial reviewer.
- **medium** — 1 implementer + gate + an independent cross-lineage **dual review** on every PR: each reviewer posts a PR comment; the orchestrator synthesizes (agreements / disagreements / deduped severity-ranked punch-list). Blockers-only veto. → `/agentic-workflow:review`.
- **hard** — competitive best-of-N across lineages → **smart-merge** grafts the best attempts into one diff → **then the medium dual review** on that result, with ≥1 structurally-clean lens (**hard ⊇ medium**).

**Model policy is by reference: AW-0004 + the baseline `docs/MODELS.md`** (the living model→role→tier table, revisited there). This repo keeps **no local `MODELS.md`** and names no models inline.

**Post-review remediation (AW-0010):** the remediator is the tier's implementer; default re-check is a targeted re-verify; excess findings escalate a tier + a full re-review; capped at 3 rounds → `needs-human` (AW-0006). **Minimalism (AW-0011):** deliberate corners carry `// SHORTCUT(<ceiling>): <upgrade path>` markers (reviewer-enforced; `grep -rn 'SHORTCUT('` is the ledger).

**smart-merge ≠ auto-merge:** smart-merge synthesizes N attempts into one diff; the PR **merge stays human** by default (AW-0003). Auto-merge is the separate, orthogonal advanced tier (AW-0008) — `hard` does *not* imply it.

## Gate
`pnpm run build && pnpm run lint && pnpm run test && pnpm run validate` — the bar; CI runs exactly this.

## Tiers — add complexity only when a trigger fires
- **Baseline (always):** AGENTS.md, thin CLAUDE.md/.cursor rules, task template, the gate + CI required check + protected main, pre-commit, **pnpm via Corepack for new Node repos (AW-0009; this repo migrated to pnpm 2026-06-09)**, the rituals below. *Recommended:* codegraph + code-review-graph (navigation, **not proof**).
- **Deferred (add when…):** Semgrep/CodeQL (security/scale) · ast-grep (codemods) · stacked PRs (large changes) · SonarQube/CodeRabbit (team).
- **Advanced (earned, opt-in per repo):** autonomous auto-merge — only after real CI required-checks + a Narrow→Widen rollout. Until then, **humans merge.**

## Engine
Orchestration (worktree sessions, run agents, review diffs) = **Superset** (AW-0002) — a macOS app *and* a headless **CLI / SDK / MCP server** driving your subscription CLIs (bundled at `~/.superset/bin/superset`). The [agentic-workflow](https://github.com/apatrem/agentic-workflow) plugin ships the conventions; it does not implement an engine. Spawn workers interactively (GUI) **or** programmatically — `superset workspaces create … --agent <lineage> --prompt <task>` puts each worker with the right model in its own worktree (see `/agentic-workflow:run`; re-check `superset --help` on upgrade); use `superset agents create --workspace …` to run agents in an *existing* workspace (e.g. PR reviewers). **A human merges** by default. `hard`'s best-of-N = N spawned agents across lineages; `medium`/`hard`'s dual review spawns the reviewer CLIs (pinned models — see `/agentic-workflow:review`). The engine is a *pluggable slot* — swap in another manager (e.g. Claude Squad) in one line.

## Rituals
1. **Grill before code** — ambiguity dies in Phase 1 (`/agentic-workflow:architect`), not in the PR.
2. **Deterministic gate before any AI review** — don't pay tokens to review red code.
3. **Small-PR budget** — routine < 300 lines; split/stack larger; separate mechanical from behavioural.
4. **Sparse review** — blockers only, ≤10 findings, ranked. AI review is an assistant, not a merge authority (it catches ~15–31% of issues).
5. **Lessons → guardrails** — every recurring mistake becomes a test / lint / Semgrep / AGENTS.md rule.
