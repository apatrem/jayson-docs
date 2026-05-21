---
description: Autonomous one-task loop driver — implement next eligible task, run gates, commit, push, regenerate STATUS.md, then continue or halt
---

You are an autonomous task runner for `docs/TASKS.md`. One invocation = one or more tasks, ending when the halt rules trip or `ALL DONE`.

**Operating principle: be conservative.** Default action when something is wrong is to *halt cleanly* with a clear `STATUS.md` and `BLOCKERS.md` entry. Never force-push. Never commit unrelated changes. Never silently regress.

---

# Model and effort tier (read this before doing anything)

This loop's quality depends on the model and reasoning-effort tier running it. The human picks the right combination in their chat app before issuing `/loop` or `/next-task`. If you are an LLM reading this spec: confirm your tier matches the recommendation below; if you cannot tell what tier you are running at, assume the default tier and proceed with extra care on long procedural steps (every pre-flight check, every halt-rule arithmetic step, every STATUS.md regeneration).

## Default tier — handles ~90% of tasks

| App | Model | Effort / Thinking budget |
|---|---|---|
| Claude Code | Claude Sonnet 4.6 | **high** |
| Cursor (Composer) | Claude Sonnet 4.6 | **max thinking** (the "high reasoning budget" label, NOT the Claude Max plan) |
| Cursor (Composer) | GPT-5 | **high** reasoning |
| Codex desktop / ChatGPT | GPT-5 | "Think harder" / high reasoning |
| Gemini Code | Gemini 2.5 Pro | extended thinking ON |

## Escalation tier — for the ~10% of harder tasks

For the task IDs listed below, a stronger model is recommended. The agent does NOT halt on tier mismatch; it emits a one-line warning in STATUS.md saying `tier-mismatch: T-NN benefits from <stronger model>; running on <current tier>`, then proceeds. The human can intervene by stopping the loop, switching model in their app, and re-running for that specific task.

**Tasks that benefit from escalation:**

- T-41 through T-49 (M1d setup AI pipeline — novel architecture)
- T-46b (runtime watchdog — security-sensitive)
- T-67, T-72 (cost ledger + no-prompt-content invariant test — privacy invariant)
- T-89c, T-89d (perf benchmark harness + adversarial watchdog test)
- **Any task that has been `[?]`'d once already** — the second attempt deserves more reasoning depth

| App | Stronger model | Effort |
|---|---|---|
| Claude Code | Claude Opus 4.7 | **high** (escalate to **xhigh** only after a failed retry on `high`) |
| Cursor (Composer) | Claude Opus 4.7 | **max thinking** |
| Cursor (Composer) | GPT-5 Pro / o-series reasoning | **high** reasoning |
| Codex / ChatGPT | GPT-5 Pro | "Think harder" |
| Gemini Code | Gemini 2.5 Pro Thinking | extended thinking ON |

## Tiers that should NOT run this loop

This spec is 240+ lines of conservative procedural protocol. Models without sufficient reasoning budget *will* skip steps. Avoid:

- Claude Sonnet/Haiku at **medium** or **default** effort
- Claude Haiku at any effort
- GPT-5 at **low** or **default** reasoning
- GPT-4o / GPT-4-turbo (predecessor models)
- Cursor "Composer 1", "fast", "cmd-k-fast", or any "auto" model selection (favors fast variants for cost)
- Any model where the reasoning-effort budget cannot be set explicitly

If you are an LLM reading this spec and you suspect you are in this "should not run" tier (small parameter count, no extended thinking, fast-and-cheap variant): write a `BOOT-CHECK-FAILED` STATUS.md with state `TIER-TOO-LOW` listing your model name, and stop the invocation. The human will switch model and re-fire.

## Self-reporting in STATUS.md

On every fire's STATUS.md regeneration, include a line near the top:

```
Running on: <model name> at <effort>  (or "(effort unknown)" if undetectable)
```

If the current task is in the escalation list and the agent is on the default tier, also add a line under "What needs your attention":

```
⚠ Tier-mismatch advisory: T-NN benefits from escalation-tier reasoning.
  Currently: <default tier>. If quality is poor, retry on escalation tier.
```

This is informative, not blocking. The loop proceeds.

## BLOCKERS.md hint for escalation tasks

When marking an escalation-tier task `[?]`, append to its BLOCKERS.md entry's `Suggested action for human` section:

```
- This task is on the escalation list. If retrying, switch model to <stronger model> + <high/max thinking> before unblocking.
```

---

# Status markers (canonical reference)

| Marker | Meaning | Eligible to pick? |
|---|---|---|
| `[ ]` | Not started | ✅ if all `Inputs:` are `[x]` or `[skip]` |
| `[~]` | In progress (claimed by current invocation) | ❌ |
| `[x]` | Done | ❌ |
| `[?]` | Needs human input — counts toward halt rules | ❌ |
| `[!]` | Waiting on external dep — doesn't halt; auto-promote to `[?]` after 3 unresolved fires | ❌ |
| `[skip]` | Deliberately not doing | ❌ (treated like `[x]` for eligibility) |
| `[GATE FAILED]` | On milestone header — triggers C-rule halt | — |

---

# Pre-flight checks (run at start of every invocation; halt to `BOOT-CHECK-FAILED` on any failure)

1. Current branch is `main`. (`git rev-parse --abbrev-ref HEAD`)
2. Working tree is clean — no unstaged or staged changes. (`git status --porcelain` is empty)
3. After `git fetch`, `HEAD` equals `origin/main` (no divergence, no commits ahead or behind).
4. Required files exist: `docs/TASKS.md`, `docs/DECISIONS.md`, `docs/BUILD_BRIEF.md`, `AGENTS.md`, `starter/package.json`.
5. `node_modules/` exists OR no `package.json` at repo root (pre-M0 case is fine).
6. No `[~]` markers anywhere in `docs/TASKS.md`. If found:
   - Discard any uncommitted changes: `git checkout -- .`
   - Reset any local-only commit: `git reset --hard origin/main`
   - Change the `[~]` marker back to `[ ]` in `docs/TASKS.md`
   - Append an entry to `BLOCKERS.md`: `## T-NN — was [~] on cold start; auto-reverted. Task will be re-attempted.`
   - Commit + push the `TASKS.md` + `BLOCKERS.md` change with message `T-NN: reset stale [~] marker`
   - **Continue to step 7** (do not halt — strict reset is recovery, not failure)
7. CI status on origin/main is green (see CI-poll section below). If `failure`: halt to `CI-FAILED`.

If any check fails (except #6 which auto-recovers), regenerate `STATUS.md` with `BOOT-CHECK-FAILED` state listing the failed check, then stop the invocation. The next loop fire will re-run pre-flight; if conditions cleared, work resumes.

---

# CI-poll (per `AGENTS.md` `loop.ci-poll`)

If `ci-poll: true` in AGENTS.md:
- Before picking a new task, run: `gh run list --branch main --limit 1 --json conclusion --jq '.[0].conclusion'`
- If output is `failure`: treat as a milestone-gate failure. Mark the current milestone header `[GATE FAILED]` and halt to `CI-FAILED`.
- If `gh` is not installed or the command errors: warn in `STATUS.md` (`CI-poll skipped — gh not available`) but continue. Do not halt.

---

# Main loop steps

Repeat steps 1–7 in the same invocation until a stop condition fires.

## Step 1 — PICK

Read `docs/TASKS.md`. Find the lowest-numbered task with marker `[ ]` whose `Inputs:` dependencies are all `[x]` or `[skip]`.

**Check halt rules before claiming:**
- **A-rule:** look at the last 2 tasks (by sequence in TASKS.md) with markers in `{[x], [?], [skip]}`. If both are `[?]`: halt to `A-RULE-HALT`. Regenerate STATUS.md with the halt brief (see §STATUS.md regeneration). Stop the invocation.
- **C-rule:** find the milestone the candidate task belongs to (by the most recent `## Phase N — M*` header above it). If that milestone header has `[GATE FAILED]` OR if any task in that milestone has marker `[?]`: halt to `C-RULE-HALT`. Regenerate STATUS.md. Stop the invocation.

If no candidate task exists:
- If no `[ ]` tasks remain AND no `[?]`/`[!]` remain: stop with `ALL DONE`. Regenerate STATUS.md.
- If `[?]`/`[!]` remain but no eligible `[ ]`: halt to `BLOCKED-NO-ELIGIBLE`. Regenerate STATUS.md.

If a candidate task exists and halt rules pass:
- Change its marker from `[ ]` to `[~]` in `docs/TASKS.md`.
- Commit + push just the `TASKS.md` change with message `T-NN: claim`.

## Step 2 — IMPLEMENT

- Read the task's `Inputs:` files referenced in its body.
- Read any `DECISIONS.md` entries referenced by ID (`D-NN`).
- For block tasks: clone the pattern from `reference/callout/` or `reference/chart/`.
- For setup-pipeline tasks: follow `docs/SETUP_PIPELINE.md` literally.
- Write/edit only files listed in the task's `Outputs:` field. Do not modify unrelated files.

**Auto-recover** on these common issues without halting:
- Missing imports → add them.
- Type errors → fix them.
- Lint violations → fix or auto-format with prettier.
- Missing test fixtures the task expects → create from `examples/` patterns.

If the task's `Outputs:` requires touching files outside the declared list, *and* the addition is obviously necessary (e.g., updating `src/schema/blocks/index.ts` to include a new block in the union): proceed and document in commit body. If the scope expansion feels non-obvious: mark the task `[?]` with reason `scope-ambiguous: <what's unclear>` and continue to step 7 NEXT.

## Step 3 — TEST

Run the relevant test command for the files just changed:
- `npm test -- <changed-paths>` for schema/renderer/component tests.
- `npm test` (full suite) for tasks affecting cross-cutting infrastructure (mapping, primitives, watchdog).

If failures, iterate up to **5 fix cycles**, re-running tests after each fix.

If still failing after 5 cycles:
- Revert working-tree changes for this task: `git checkout -- <files>`
- Change the marker from `[~]` back to `[?]` in TASKS.md with inline reason: `[?] T-NN  blocked: tests fail after 5 fixes — <one-line summary>`
- Append a detailed entry to `BLOCKERS.md` (see §BLOCKERS.md append).
- Commit + push the marker change with message `T-NN: block — tests failing`.
- **Continue to step 7 NEXT** (loop will re-evaluate halt rules at next pick).

## Step 4 — REVIEW (inline self-review)

Re-read the files just changed against:
- The task's `Acceptance:` criteria.
- `BLOCK_IMPLEMENTATION_GUIDE.md` §5 (5-layer test rule) if a block task.
- `starter/.eslintrc.cjs` architectural invariants: no hard-coded hex colors in `src/renderer/blocks/` or `src/block-primitives/`; no `dangerouslySetInnerHTML`; no `eval` / `new Function`.
- Brand-token consumption (no inline colors / fonts / spacing in renderer tasks).
- `.strict()` applied for schema tasks.

Correctness or security violations: fix and re-run TEST. Style-only nits: note in commit body, don't block.

## Step 5 — GLOBAL QUALITY GATES (β)

Run, in order:
1. `tsc --noEmit` (project-wide typecheck)
2. `npm run lint`

If either fails:
- Revert the working tree: `git checkout -- .`
- Mark the task `[?]` with reason `broke project-wide tsc` or `broke project-wide lint`.
- Append to BLOCKERS.md with the first 20 lines of the error output.
- Commit + push the marker change.
- **This counts toward the A-rule consecutive `[?]` count.**
- Continue to step 7 NEXT.

If both pass: continue to step 6.

## Step 6 — COMMIT + PUSH

- Stage only the files this task touched (use explicit `git add <file>` not `git add -A`).
- Stage `docs/TASKS.md` (the `[~]` → `[x]` marker change).
- Single commit, message format:

  ```
  T-NN: <subject from task title, lowercase first word>

  <1-3 lines: what changed and why>

  Co-Authored-By: <model-name> <noreply@anthropic.com>
  ```

- Do **not** amend previous commits. Do **not** use `--no-verify`. Do **not** include unrelated changes.
- `git push origin main`.
- If push rejected (non-fast-forward): `git pull --rebase origin main`, retry push **once**. If still rejected: this is the one true halt condition besides ALL DONE — mark task `[?]` with `push-conflict: needs manual rebase`, commit + push the marker change as a separate small commit, halt to `PUSH-CONFLICT`. Stop the invocation.

## Step 6.5 — MILESTONE GATE CHECK (only when entering a new milestone)

If the task just completed was the **last `[ ]` task in its milestone** (all sibling tasks now `[x]` or `[skip]`):

- Run the milestone's full gate: `npm run build && npm test` plus any milestone-specific assertion in `docs/BUILD_BRIEF.md`.
- If gate passes: continue to step 7.
- If gate fails:
  - Mark the milestone header `[GATE FAILED]` in TASKS.md (e.g., `### Sub-phase 1A — Core schema [GATE FAILED]`).
  - Append a "## M1a — gate failed" entry to BLOCKERS.md listing every commit since the previous green gate as a suspect. Recommend `git bisect` to the human.
  - Commit + push the marker change.
  - Halt to `MILESTONE-GATE-FAILED`. Stop the invocation.

## Step 7 — NEXT

- If we just completed a task (`[x]`): regenerate STATUS.md. Loop back to step 1 (pick next).
- If we just blocked (`[?]`) or external-blocked (`[!]`):
  - Increment `[!]` auto-promotion counter for any `[!]` markers in BLOCKERS.md older than this fire's start time:
    - For each `[!]` entry in BLOCKERS.md, find the `**Fires unresolved:**` line. Increment by 1.
    - If counter reaches **3**: rewrite that task's marker in TASKS.md from `[!]` to `[?]` with appended reason `auto-promoted from [!] after 3 unresolved fires`. Update the BLOCKERS.md entry's marker line.
  - Regenerate STATUS.md.
  - Loop back to step 1 (try to pick next eligible task — halt rules will catch us if we should stop).

# Stop conditions (this invocation exits)

Only these terminate the invocation:
1. **ALL DONE** — no `[ ]` tasks remain; no `[?]`/`[!]` remain. Success terminal state.
2. **A-RULE-HALT** — 2 consecutive `[?]` markers.
3. **C-RULE-HALT** — current milestone has `[?]` marker.
4. **PUSH-CONFLICT** — push rejected after rebase retry.
5. **MILESTONE-GATE-FAILED** — full milestone gate failed.
6. **CI-FAILED** — origin/main CI is red.
7. **BOOT-CHECK-FAILED** — pre-flight failed.
8. **BLOCKED-NO-ELIGIBLE** — `[?]`/`[!]` exist but no eligible `[ ]` task can be picked (dependency chain).

Each terminal state writes the matching STATUS.md and exits cleanly. The `/loop` keeps firing; the next fire will either find conditions cleared (and resume) or hit the same halt and emit a one-liner.

---

# STATUS.md regeneration (every fire, on every state change)

Rewrite `STATUS.md` at repo root, replacing existing content. Use this exact template:

```markdown
# Loop status — auto-generated; do not edit

**Last fire:** <ISO-8601 UTC>
**State:** <RUNNING | HALTED | ALL_DONE | BOOT-CHECK-FAILED | CI-FAILED>
**Halt reason:** <one-line, only if HALTED>
**Halted since:** <ISO-8601 UTC, only if HALTED>

---

## What needs your attention (only when HALTED)

<List blockers in priority order. For each:>
1. **T-NN** — `[?]` <one-line reason>
   → BLOCKERS.md §T-NN
   → Suggested fix: <derived from BLOCKERS.md suggested-action>

## Next eligible task (when human unblocks)

<T-MM and its title, or "none — all blockers must clear" if dependency-chain stuck>

## Progress since the previous fire

<Diff against the previous STATUS.md's progress numbers:>
- ✅ <N> tasks completed this fire: <task IDs>
- ⚠ <N> tasks blocked this fire: <task IDs>
- ⏸ <N> tasks marked waiting this fire: <task IDs>
- ↩ <N> commits reverted this fire (regressions): <commit SHAs>

## At a glance

Total tasks: <N>   Done: <N> (<%>)   Blocked: <N>   Waiting: <N>   Open: <N>   Skipped: <N>

## Recent commits

<git log --oneline -8>

## CI status (origin/main)

<output of gh run list ... OR "CI-poll disabled" OR "gh not available">
```

When state is `RUNNING` and the loop just finished work cleanly: also emit the section "Loop is running cleanly — no action needed."

---

# BLOCKERS.md append rules (when a `[?]` or `[!]` is created)

Open `BLOCKERS.md` at repo root. Append (never rewrite):

```markdown
## T-NN — <task subject>
**Status:** [?] or [!]
**Detected at:** <ISO-8601 UTC>
**Fires unresolved:** 0     (only for [!]; increments per fire until auto-promotion)
**Reason:** <one paragraph>
**Last attempt:** <commit SHA or "no commit — reverted">
**Suggested action for human:**
- <bullet>
- <bullet>

---
```

Never delete entries — the human is responsible for deleting resolved entries after fixing the underlying issue.

---

# Final invocation report (chat output, after the invocation exits)

```
<State emoji + STATE>

Completed this invocation: <N tasks: T-AA, T-BB, ...>
Blocked this invocation:   <N: T-CC ([?]), T-DD ([!])>

Next: <one-liner — what the next fire will try OR what the human must do>
```

Examples:

- `✅ ALL DONE — 47 tasks completed across 23 fires. See STATUS.md for full summary.`
- `🛑 A-RULE-HALT — T-43, T-44 both [?]. See BLOCKERS.md. Next fire: re-checks 45m from now.`
- `▶ RUNNING — completed 3 tasks (T-12, T-13, T-14). Next fire will pick T-15.`

---

# Hard rules (never violate)

- **Never force-push.** Push rejection → halt to PUSH-CONFLICT.
- **Never amend** existing commits. New commits only.
- **Never bypass hooks** (`--no-verify`, `--no-gpg-sign`).
- **Never use `git add -A` or `git add .`** — always explicit paths.
- **Never modify files outside the current task's declared `Outputs:`** without explicit reasoning in the commit body.
- **Never silently adjust DECISIONS.md targets** when a perf or quality gate fails — file the regression as a blocker; let the human decide whether to relax the target.
- **Never delete BLOCKERS.md entries.** Append-only.
- **Never start work without a clean pre-flight.**
