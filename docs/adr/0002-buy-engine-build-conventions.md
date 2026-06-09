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
- This pack ships only the **conventions, planning (grill-me), task template, and ADRs** — the
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
- **Posture shift:** Composio was *automated / headless*; Superset is *interactive* — **the human drives the
  loop** (session → implement → gate → review diff → PR). This only deepens human-merge (ADR-0003) and
  fail-to-human (ADR-0006). Best-of-N (the `hard` tier, ADR-0004) gets *better*: N parallel sessions, compare
  diffs, pick.
- **Mechanism:** the Composio `agent-orchestrator.yaml` / `worker.agent` (and `ao spawn` for reviews) is
  gone; the worker/reviewer agent is chosen per session in Superset. The Cursor-Composer-default *preference*
  stands.
- **Caveats (recorded, not blocking — solo / local / macOS):** Superset is **Elastic License 2.0**
  (source-available, not OSS); **macOS-only** today; **auth unverified** — gate before trusting it: confirm
  it launches `cursor-agent` / `claude` on **subscription login, not API keys** (the constraint above). If it
  forces API keys, swap it out.
- **Consequence for ADR-0008:** an *interactive* engine has no headless loop, so it **cannot** serve the
  autonomous auto-merge tier — that tier now needs a future *automated* engine and stays inert until one
  exists.
- **Fallbacks (one-line swap):** **Claude Squad** (minimal TUI, more battle-tested); **Sculptor**
  (Docker-container isolation, stronger than worktrees — ADR-0006).

## Update (2026-06) — Cursor Composer is the default solo implementer
> *Mechanism superseded by the engine Update above:* under Superset the agent is picked **per session**,
> not via `agent-orchestrator.yaml` / `worker.agent`. The **preference** (Cursor Composer as the default
> solo implementer) recorded below still holds.

The latest Cursor Composer (driven via `cursor-agent`) has matured past the beta-era flakiness noted
above and is now the **default solo implementer** — set as the *worker* agent
(`worker.agent: cursor`) in each repo's `agent-orchestrator.yaml`, which overrides the flat `agent`
for worker sessions only and leaves the separate **orchestrator** role (typically `claude-code`)
untouched. Rationale: in the operator's runs the latest Composer is reliable enough
for the routine ~90% path (ADR-0004), and its tendency toward small, surgical diffs matches this
project's reward function — *"reward the smallest passing diff, not cleverness."* `claude` and `codex`
remain first-class and are the natural overrides for competitive best-of-N (`ROLES.md`);
graceful degradation on worker error is unchanged. This sets the *recommended* default only — the
actual pin still lives per-repo in `agent-orchestrator.yaml`.
