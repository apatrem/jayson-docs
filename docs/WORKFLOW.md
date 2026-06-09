# Agentic coding workflow (one page)

**Backbone (this repo):** `AGENTS.md` (cross-tool source of truth) + a deterministic gate (build/lint/test/validate) enforced by **CI required checks** on a **protected main** + small **PRs**.
*LLMs propose. Tools verify. Git isolates. CI decides. Humans merge. Rules remember.*

Product/architecture decisions live in `docs/DECISIONS_LOG.md`. Process/orchestration ADRs live in `docs/adr/`.

## The loop
idea → **/grill-me** → `tasks/T-xxx.md` (acceptance = tests; `mode: low|medium|hard`) → implement in an isolated worktree → gate green → small PR → review per tier (blockers only; `medium`/`hard` add the dual review) → **human merges** → recurring mistake → a test/lint/rule.

## Effort/review dial — `mode: low | medium | hard` (default `low`; prefer low, justify higher)
One dial, two axes (authoring depth × review rigor); set per task, default `low` (ADR-0004).
- **low** *(default, ~90%)* — 1 implementer + deterministic gate + 1 adversarial reviewer.
- **medium** — 1 implementer + gate + an independent **dual review** on every PR: **GPT-5.5 @ xhigh** (codex) **and** **Opus 4.8 @ ultrathink** (claude-code), each posts a PR comment; orchestrator synthesizes (agreements / disagreements / deduped severity-ranked punch-list). Blockers-only veto. → `/agentic-workflow:review`.
- **hard** — competitive best-of-N across lineages → **smart-merge** (an Opus 4.8 synthesizer grafts the best attempts into one diff) → **then the medium dual review** on that result (**hard ⊇ medium**).

**smart-merge ≠ auto-merge:** smart-merge synthesizes N attempts into one diff; the PR **merge stays human** by default (ADR-0003). Auto-merge is the separate, orthogonal advanced tier (ADR-0008) — `hard` does *not* imply it.

## Gate
`npm run build && npm run lint && npm run test && npm run validate` — the bar; CI runs exactly this.

## Tiers — add complexity only when a trigger fires
- **Baseline (always):** AGENTS.md, thin CLAUDE.md/.cursor rules, task template, the gate + CI required check + protected main, pre-commit, the rituals below. *Recommended:* codegraph + code-review-graph (navigation, **not proof**).
- **Deferred (add when…):** Semgrep/CodeQL (security/scale) · ast-grep (codemods) · stacked PRs (large changes) · SonarQube/CodeRabbit (team).
- **Advanced (earned, opt-in per repo):** autonomous auto-merge — only after real CI required-checks + a Narrow→Widen rollout. Until then, **humans merge.**

## Engine
Orchestration (worktree sessions, run agents, review diffs) = **Superset** — an interactive macOS manager driving your subscription CLIs (ADR-0002 Update). The [agentic-workflow](https://github.com/apatrem/agentic-workflow) plugin ships the conventions; it does not implement an engine. **You drive the loop; a human merges.** `hard`'s best-of-N runs as N parallel sessions; `medium`/`hard`'s dual review runs the reviewer CLIs (pinned models — see `/agentic-workflow:review`). The engine is a *pluggable slot* — swap Superset for another interactive manager (e.g. Claude Squad) in one line.

## Rituals
1. **Grill before code** — ambiguity dies in /grill-me, not in the PR.
2. **Deterministic gate before any AI review** — don't pay tokens to review red code.
3. **Small-PR budget** — routine < 300 lines; split/stack larger; separate mechanical from behavioural.
4. **Sparse review** — blockers only, ≤10 findings, ranked. AI review is an assistant, not a merge authority (it catches ~15–31% of issues).
5. **Lessons → guardrails** — every recurring mistake becomes a test / lint / Semgrep / AGENTS.md rule.
