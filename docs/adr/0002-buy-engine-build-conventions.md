# ADR 0002 — Buy the orchestration engine (Composio); build only the conventions/policy

**Status:** accepted — engine *pick* amended 2026-06 (**Composio → Superset**; see Update below); the
**principle** (separate policy from engine) stands.

## Context
The orchestration plumbing — isolating worktrees, running agents, opening PRs — is commoditised and
more mature off-the-shelf than anything we would maintain. Our differentiator is the
**policy/conventions**, not a from-scratch runner. Operating constraint: the operator drives monthly
**subscriptions, not API keys**; vendor terms permit driving the **official CLIs** headlessly under
subscription (rate-limited) but prohibit extracting OAuth tokens into a custom client.

## Decision
- **Engine = Composio (`@aoagents/ao`)** — it drives the official Claude / Codex / Cursor CLIs on
  subscription auth, isolates each worker in its own worktree, and opens PRs. **Never token
  extraction.** **Engine pick superseded — see Update (engine, 2026-06) below.**
- This pack ships only the **conventions, planning (grill-with-docs), task template, and ADRs** — the
  operating manual and scaffolder that sit on top of the engine.
- **Merge vehicle = a PR**, never `git push HEAD:main`. CI re-runs the gate in the canonical
  environment; **the PR is both the merge vehicle and the human handoff**.

## Consequences
- One mature engine, maintained by someone else; we maintain policy.
- Composio is fleet-first, so **competitive best-of-N is manual** (same task, agent overridden;
  a human picks/merges) — acceptable, since best-of-N is the ~10% case (ADR-0004).
- Cursor CLI was beta at time of writing (the flakiest worker); the engine degrades gracefully if a
  worker errors. **Superseded for the default implementer — see Update (2026-06) below.**
- If Composio is ever swapped out, the backbone (ADR-0001) and these conventions are unaffected.

## Update (2026-06) — engine pick swapped: Composio → Superset
Composio caused real operating friction — **bugs**, a **weak interface**, and **suspected high token spend**
(its LLM-driven orchestrator burns tokens on coordination, separate from implement/review). The **principle
above is unchanged** — the engine was always a swappable slot (see Consequences) — so only the *pick* moves.
Read the engine generically as **"an interactive worktree session manager"**; the specific tool is a
one-line, swappable detail.

- **Current pick = [Superset](https://github.com/superset-sh/superset)** — a macOS app; each agent in its
  own git worktree; first-class **Cursor** support (the Cursor-Composer solo default below carries over),
  plus Claude / Codex / OpenCode / Amp. Zero token markup. The orchestrator runs **no LLM**, which removes
  the token-overhead concern.
- **Two surfaces — interactive *and* headless.** Superset is both a macOS app **and** a **CLI / TypeScript
  SDK / MCP server** ([docs.superset.sh](https://docs.superset.sh); CLI bundled at `~/.superset/bin/superset`).
  An operator can spawn workers programmatically — via MCP (preferred) or the CLI — with a one-shot
  `superset workspaces create … --agent <lineage> --prompt <task>` (verified v0.2.19; re-check on upgrade),
  putting each worker with the right model in its own worktree. Use `superset agents create --workspace …`
  to run an agent in an *existing* workspace (e.g. PR reviewers). A human still merges by default
  (ADR-0003 / 0006). Best-of-N (`hard`, ADR-0004): spawn N agents across lineages, compare diffs, pick.
- **Mechanism:** the Composio `agent-orchestrator.yaml` / `ao spawn` wiring is gone; pick the worker/reviewer
  model via `--agent <preset>` on spawn (CLI/GUI) or per session in the GUI. The Cursor-Composer-default
  *preference* stands (see Update below).
- **Caveats (recorded — solo / local / macOS):** Superset is **Elastic License 2.0** (source-available, not
  OSS) and **macOS-only** today. **Auth:** the control plane logs in via OAuth device-code / API key
  (`superset auth login`); the *agents* run the underlying CLIs (a preset is a stored command run in a
  terminal), so they use **the CLI's own subscription login** — the no-token-extraction constraint above
  holds. *Confirmed (2026-06): spawning `claude` / `cursor-agent` uses the existing CLI login, no provider API key.*
- **ADR-0008 is *not* blocked by the engine.** The headless CLI/SDK gives the spawn + gate primitives an
  auto-merge loop needs (`superset workspaces create … --agent … --prompt …`;
  `superset terminals create --command <gate>`); what
  remains is ADR-0008's own code-side decision + `gh` merge. (An earlier draft wrongly called an interactive
  engine a dead-end here.)
- **Fallbacks (one-line swap):** **Claude Squad** (minimal TUI, more battle-tested); **Sculptor**
  (Docker-container isolation, stronger than worktrees — ADR-0006).

## Update (2026-06) — Cursor Composer is the default solo implementer

Under Superset the agent is picked **per spawn or session** (`--agent cursor` / Cursor Composer in the GUI) —
not via a repo-level harness config. The latest Cursor Composer (driven via `cursor-agent`) has matured past
the beta-era flakiness noted above and is the **default solo implementer** for `mode: low` (ADR-0004): one
worker on lineage **cursor**, routine ~90% path. Rationale: reliable enough in practice, and its tendency
toward small, surgical diffs matches the reward function — *"reward the smallest passing diff, not
cleverness."* `claude` and `codex` remain first-class overrides for competitive best-of-N (`ROLES.md`);
graceful degradation on worker error is unchanged.
