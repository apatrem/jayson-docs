# Agentic coding workflow (one page)

**Backbone (this repo):** `AGENTS.md` (cross-tool source of truth) + a deterministic gate (build/lint/test/validate) enforced by **CI required checks** on a **protected main** + small **PRs**.
*LLMs propose. Tools verify. Git isolates. CI decides. Humans merge. Rules remember.*

Product/architecture decisions live in `docs/DECISIONS_LOG.md`. Process/orchestration ADRs live in `docs/adr/`.

## The loop
idea → **`/agentic-workflow:architect`** (grill-with-docs → ADRs + `CONTEXT.md`; human signs each ADR) → **`/agentic-workflow:plan`** (`tasks/T-xxx.md` + frozen red tests; human sign-off) → *(codegraph maps blast radius)* → **`/agentic-workflow:run`** (implement in an isolated worktree) → gate green → small PR → review per tier (blockers only; `medium`/`hard` add the dual review) → **human merges** → recurring mistake → a test/lint/rule.

## Effort/review dial — `mode: low | medium | hard` (default `low`; prefer low, justify higher)
One dial, two axes (authoring depth × review rigor); set per task, default `low` (ADR-0004).
- **low** *(default, ~90%)* — 1 implementer + deterministic gate + 1 adversarial reviewer.
- **medium** — 1 implementer + gate + an independent cross-lineage **dual review** on every PR: two reviewers of different lineage, each independent of the implementer, each posts a PR comment; orchestrator synthesizes (agreements / disagreements / deduped severity-ranked punch-list). Blockers-only veto. → `/agentic-workflow:review`.
- **hard** — competitive best-of-N over **two lineages** → **smart-merge** into one diff → **then the medium dual review** on that result, with **≥1 structurally-clean lens** (**hard ⊇ medium**).

**`mode` is a floor (ADR-0004 refinement 3):** the declared tier is a minimum, never a ceiling. A change touching protected/destructive surface (`rm -rf`/in-place rewrites, the gate or CI config, lockfiles/deps, migrations·schema·the Zod layout schemas/`layout-spec.json`, auth/secrets, public API or the fill-plan contract) is forced to **≥ `medium`** regardless of declared mode; the orchestrator records *"escalated by risk floor"*. (Reactive escalation on excess findings is **ADR-0010**.)

**Model policy → `docs/MODELS.md` (single source of truth).** The model→role→tier picks live there, not inline. Current policy: **GPT-5.5 primary** (single reviewer at `low`, dual at `medium`/`hard`); **Opus 4.8** is the Claude medium lens and the `hard` structurally-clean lens; **Fable 5** is only the optional `hard` 3rd lens (Fable-first is **retired** — ADR-0004 Update). Pin via CLI `--model`/`--effort` flags; never the retired `ultrathink` prefix.

**smart-merge ≠ auto-merge:** smart-merge synthesizes N attempts into one diff; the PR **merge stays human** by default (ADR-0003). Auto-merge is the separate, orthogonal advanced tier (ADR-0008) — `hard` does *not* imply it.

## Gate
`pnpm run build && pnpm run lint && pnpm run test && pnpm run validate` — the bar; CI runs exactly this.

## Tiers — add complexity only when a trigger fires
- **Baseline (always):** AGENTS.md, thin CLAUDE.md/.cursor rules, task template, the gate + CI required check + protected main, pre-commit, **pnpm via Corepack for new Node repos (ADR-0009; this repo migrated to pnpm 2026-06-09)**, the rituals below. *Recommended:* codegraph + code-review-graph (navigation, **not proof**).
- **Deferred (add when…):** Semgrep/CodeQL (security/scale) · ast-grep (codemods) · stacked PRs (large changes) · SonarQube/CodeRabbit (team).
- **Advanced (earned, opt-in per repo):** autonomous auto-merge — only after real CI required-checks + a Narrow→Widen rollout. Until then, **humans merge.**

## Engine
Orchestration (worktree sessions, run agents, review diffs) = **Superset** (ADR-0002 Update) — a macOS app *and* a headless **CLI / SDK / MCP server** driving your subscription CLIs (bundled at `~/.superset/bin/superset`). The [agentic-workflow](https://github.com/apatrem/agentic-workflow) plugin ships the conventions; it does not implement an engine. Spawn workers interactively (GUI) **or** programmatically — `superset workspaces create … --agent <lineage> --prompt <task>` puts each worker with the right model in its own worktree (see `/agentic-workflow:run`; re-check `superset --help` on upgrade); use `superset agents create --workspace …` to run agents in an *existing* workspace (e.g. PR reviewers). **A human merges** by default. `hard`'s best-of-N = N spawned agents across lineages; `medium`/`hard`'s dual review spawns the reviewer CLIs (pinned models — see `/agentic-workflow:review`). The engine is a *pluggable slot* — swap in another manager (e.g. Claude Squad) in one line.

## Rituals
1. **Grill before code** — ambiguity dies in Phase 1 (`/agentic-workflow:architect`), not in the PR.
2. **Deterministic gate before any AI review** — don't pay tokens to review red code.
3. **Small-PR budget** — routine < 300 lines; split/stack larger; separate mechanical from behavioural.
4. **Sparse review** — blockers only, ≤10 findings, ranked. AI review is an assistant, not a merge authority (it catches ~15–31% of issues). The `medium`/`hard` reviewer adds an advisory **minimalism lens** (ADR-0011).
5. **Minimalism, made legible** — smallest correct change as a ladder, with a floor never cut (validation / data-loss-safe error handling / security / accessibility); deliberate corners carry `// SHORTCUT(<ceiling>): <upgrade path>` markers, and `grep -rn 'SHORTCUT('` is the ledger (no `DEBT.md`; ADR-0011).
6. **Lessons → guardrails** — every recurring mistake becomes a test / lint / Semgrep / AGENTS.md rule.
