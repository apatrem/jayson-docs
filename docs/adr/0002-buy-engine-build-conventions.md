# ADR 0002 — Buy the orchestration engine (Composio); build only the conventions/policy

**Status:** accepted

## Context
The orchestration plumbing — isolating worktrees, running agents, opening PRs — is commoditised and
more mature off-the-shelf than anything we would maintain. Our differentiator is the
**policy/conventions**, not a from-scratch runner. Operating constraint: the operator drives monthly
**subscriptions, not API keys**; vendor terms permit driving the **official CLIs** headlessly under
subscription (rate-limited) but prohibit extracting OAuth tokens into a custom client.

## Decision
- **Engine = Composio (`@aoagents/ao`)** — it drives the official Claude / Codex / Cursor CLIs on
  subscription auth, isolates each worker in its own worktree, and opens PRs. **Never token
  extraction.**
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

## Update (2026-06) — Cursor Composer is the default solo implementer
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
