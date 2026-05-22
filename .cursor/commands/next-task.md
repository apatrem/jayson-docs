---
description: Autonomous one-task loop driver — implement next eligible task, run gates, commit, push, then continue or halt
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
| Cursor (Composer) | **Auto** | router-selected (per AGENTS.md; do not emit `TIER-TOO-LOW` for Auto alone) |
| Cursor (Composer) | GPT-5.5 High | when Auto is unavailable |
| Codex desktop / ChatGPT | GPT-5.5 | **high** |
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
| Cursor (Composer) | **GPT-5.5 High** | escalation tier (per AGENTS.md) |
| Cursor (Composer) | **GPT-5.5 xHigh**  | alternate if High unavailable |
| Codex / ChatGPT | GPT-5 Pro | **xHigh**|
| Gemini Code | Gemini 2.5 Pro Thinking | extended thinking ON |

## Tiers that should NOT run this loop

This spec is conservative procedural protocol. Models without sufficient reasoning budget *will* skip steps. Avoid:

- Claude Sonnet/Haiku at **medium** or **default** effort
- Claude Haiku at any effort
- GPT-5 at **low** or **default** reasoning
- GPT-4o / GPT-4-turbo (predecessor models)
- Cursor **Composer 1**, **fast**, **cmd-k-fast** (cost-optimized variants; insufficient for this protocol)
- Any model where the reasoning-effort budget cannot be set explicitly and the model is clearly a small/fast variant (e.g. Haiku, GPT-5 low)

**Cursor Auto is allowed** as the default tier (AGENTS.md). Do not halt solely because the model picker shows Auto.

If you are an LLM reading this spec and you suspect you are in this "should not run" tier (Composer 1, fast/cmd-k-fast, Haiku, or GPT-5 low): write a `BOOT-CHECK-FAILED` STATUS.md with state `TIER-TOO-LOW` listing your model name, and stop the invocation. The human will switch model and re-fire.

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
- This task is on the escalation list. If retrying, switch model to escalation tier (Claude Code: Opus 4.7 + high; Cursor: GPT-5.5 xHigh) before unblocking.
```

---

# Status markers (canonical reference)

Task headers in `docs/TASKS.md` carry the marker as a **suffix on the header line**, between the task ID and the `·` separator:

```
### T-NN [ ] · Title goes here
```

| Marker | Meaning | Eligible to pick? |
|---|---|---|
| `[ ]` | Not started | ✅ if all `Depends-on:` are `[x]` or `[skip]` |
| `[~]` | In progress (claimed by current invocation) | ❌ |
| `[x]` | Done | ❌ |
| `[?]` | Needs human input — counts toward halt rules | ❌ |
| `[!]` | Waiting on external dep — doesn't halt; auto-promote to `[?]` after 3 unresolved fires | ❌ |
| `[skip]` | Deliberately not doing | ❌ (treated like `[x]` for eligibility) |
| `[GATE FAILED]` | On milestone header — triggers C-rule halt | — |

**Dependency parsing:** the eligibility check uses ONLY the `- **Depends-on:**` field on each task. That field contains comma-separated task IDs (`T-NN`) or the literal word `none`. The `- **Reads:**` field is reading material for implementation — it has no eligibility role.

---

# Loop-managed files (canonical reference)

The loop owns these files. Any change to any of them must be staged in the next commit; the pre-commit hook enforces this.

| File | Role | When mutated |
|---|---|---|
| `docs/TASKS.md` | Source of truth for what's done | Every claim, every block, every completion, every cascade |
| `STATUS.md` | Auto-regenerated dashboard | Every fire (regenerated in step 6 before committing) |
| `BLOCKERS.md` | Append-only audit log | Failure paths, `[!]` auto-promotion |

**Hard rule (enforced by `scripts/verify-task-commit.sh`):** any commit on `main` or `bakeoff/*` that touches one of these files must stage all of them whose on-disk state differs from `HEAD`. Forgetting STATUS.md while committing a `TASKS.md` marker change is a protocol violation.

---

# Allow-list — files that may be staged outside `Outputs:`

The hard rule is **deny-by-default**: a task commit may only stage files declared in its `Outputs:` field. Exceptions for these specific paths that exist for reproducibility (not for the task's actual work product):

```
- package-lock.json       (root only — committed by every npm task that runs install)
- */Cargo.lock            (any nested Rust crate — application crates lock their deps)
- src-tauri/icons/*.png   (Tauri-init defaults; replaced later by branded assets)
- src-tauri/icons/*.ico   (Windows icon variant)
- src-tauri/icons/*.icns  (macOS icon variant)
- .gitignore              (only when ADDING patterns; never removing)
- docs/TASKS.md           (loop-managed; always allowed)
- STATUS.md               (loop-managed; always allowed)
- BLOCKERS.md             (loop-managed; always allowed)
```

Anything else outside the current task's `Outputs:` is a protocol violation. The pre-commit hook fails the commit. If a task genuinely needs to touch an unlisted file, either:
- Add it to the task's `Outputs:` in `docs/TASKS.md` first (separate commit), then re-run, OR
- Mark the task `[?]` with reason `scope-ambiguous: needs <file> outside Outputs:` and surface to the human.

---

# Pre-flight checks (run at start of every invocation; halt to `BOOT-CHECK-FAILED` on any failure)

1. Current branch is `main`. (`git rev-parse --abbrev-ref HEAD`)
2. Working tree is clean — no unstaged or staged changes. (`git status --porcelain` is empty)
3. After `git fetch`, `HEAD` equals `origin/main` (no divergence, no commits ahead or behind).
4. Required files exist: `docs/TASKS.md`, `docs/DECISIONS.md`, `docs/BUILD_BRIEF.md`, `AGENTS.md`, `starter/package.json`.
5. `node_modules/` exists OR no `package.json` at repo root (pre-M0 case is fine).
6. The pre-commit hook is installed and current: `.git/hooks/pre-commit` is a symlink (or copy) of `scripts/verify-task-commit.sh`. If missing or outdated, run `bash scripts/install-hooks.sh` automatically and continue. (This is self-healing, not a halt.)
7. No `[~]` markers anywhere in `docs/TASKS.md`. If found:
   - Discard any uncommitted changes: `git checkout -- .`
   - Change the `[~]` marker back to `[ ]` in `docs/TASKS.md`
   - Regenerate STATUS.md to reflect the reset
   - Append an entry to `BLOCKERS.md`: `## T-NN — was [~] on cold start; auto-reverted. Task will be re-attempted.`
   - Commit + push the loop-managed file changes (TASKS.md + STATUS.md + BLOCKERS.md) with message `T-NN: reset stale [~] marker`
   - **Continue to step 8** (do not halt — strict reset is recovery, not failure)
8. CI status on `origin/main` is green (see CI-poll section below). If `failure`: halt to `CI-FAILED`.

If any check fails (except #6 and #7, which auto-recover), regenerate `STATUS.md` with `BOOT-CHECK-FAILED` state listing the failed check, then stop the invocation. The next loop fire will re-run pre-flight; if conditions cleared, work resumes.

---

# CI-poll (per `AGENTS.md` `loop.ci-poll`)

If `ci-poll: true` in AGENTS.md:
- Before picking a new task, run: `gh run list --branch main --limit 1 --json conclusion --jq '.[0].conclusion'`
- If output is `failure`: treat as a milestone-gate failure. Mark the current milestone header `[GATE FAILED]` and halt to `CI-FAILED`.
- If `gh` is not installed or the command errors: warn in `STATUS.md` (`CI-poll skipped — gh not available`) but continue. Do not halt.

---

# Main loop steps

Repeat steps 1–8 in the same invocation until a stop condition fires.

## Step 1 — PICK

Read `docs/TASKS.md`. Find the lowest-numbered task with marker `[ ]` whose `Depends-on:` field is either `none` or a comma-separated list of T-NNs that are ALL `[x]` or `[skip]`.

**Check halt rules before claiming:**
- **A-rule:** look at the last 2 tasks (by sequence in TASKS.md) with markers in `{[x], [?], [skip]}`. If both are `[?]`: halt to `A-RULE-HALT`. Regenerate STATUS.md with the halt brief (see §STATUS.md regeneration). Commit + push the STATUS.md change. Stop the invocation.
- **C-rule:** find the milestone the candidate task belongs to (by the most recent `## Phase N — M*` header above it). If that milestone header has `[GATE FAILED]` OR if any task in that milestone has marker `[?]`: halt to `C-RULE-HALT`. Regenerate STATUS.md. Commit + push. Stop the invocation.

If no candidate task exists:
- If no `[ ]` tasks remain AND no `[?]`/`[!]` remain: stop with `ALL DONE`. Regenerate STATUS.md. Commit + push.
- If `[?]`/`[!]` remain but no eligible `[ ]`: halt to `BLOCKED-NO-ELIGIBLE`. Regenerate STATUS.md. Commit + push.

**Well-formedness check before claiming:**

Before changing the candidate's marker, verify the entry is actionable. The check exists because the T-33 audit showed drivers silently skip over malformed entries (no Outputs → "nothing to do" → moves to T-34 without halting), which drifts from the "lowest-numbered eligible" rule invisibly.

The candidate entry is **actionable** if AT LEAST ONE of these holds:

1. **It has an explicit `**Outputs:**` line.** (Standard case; covers ~95% of tasks.)
2. **The title ends with `(N files)`** (e.g., `Implement \`divider\` block (4 files)`). This is the terse-block pattern; the driver inherits the 4-file shape from `reference/callout/`: schema + renderer + TipTap node + test, plus a `Scope expansion:` union update.

The candidate entry is **NOT actionable** (halt to `[?]`) if any of these hold:

- **Title contains `see T-NN`, `(reference)`, or `✅` as a pointer to other work** AND the entry has no `Outputs:`. This is a pointer-stub left over when work was deferred or reassigned. Mark `[?]` with reason `pointer-stub: title points at T-NN; should be [skip] if redundant, or needs proper fields if real work`. Append a BLOCKERS.md entry asking the human to either `/skip` the task or fill in `Depends-on:` + `Outputs:` + `Acceptance:`.
- **The entry has no `Outputs:` AND no terse-pattern title.** Mark `[?]` with reason `malformed-task: no Outputs declared and title doesn't match the terse-block pattern (N files)`. Same BLOCKERS.md treatment.

Silent skipping is the worst outcome — it leaves the marker `[ ]` so future fires keep re-encountering the same anomaly, while no human ever sees a halt. The explicit `[?]` halt forces a one-line decision from the human.

If the entry IS actionable:
- Change its marker from `[ ]` to `[~]` in `docs/TASKS.md` (suffix on the header line: `### T-NN [~] · Title`).
- **Do NOT commit yet.** The marker change lives in the working tree until step 6 bundles it with the task's `Outputs:` and the regenerated STATUS.md.

> **Why no claim commit?** Earlier versions committed the `[~]` marker separately as a "claim" before implementing. The bake-off methodology that produced this spec showed drivers naturally collapse claim + implementation into one commit when allowed to — so we made one commit the rule. Crash recovery still works: pre-flight #7 finds the stale `[~]` on disk and resets it.

## Step 2 — IMPLEMENT

- Read the task's `Reads:` files (file paths, doc references, `D-NN` decisions).
- Read any `DECISIONS.md` entries referenced by ID in `Reads:`.
- For block tasks: clone the pattern from `reference/callout/` or `reference/chart/`.
- For setup-pipeline tasks: follow `docs/SETUP_PIPELINE.md` literally.
- Write/edit only files listed in the task's `Outputs:` field, plus the allow-list (above). Do not modify unrelated files.

**Auto-recover** on these common issues without halting:
- Missing imports → add them.
- Type errors → fix them.
- Lint violations → fix or auto-format with prettier.
- Missing test fixtures the task expects → create from `examples/` patterns.

If the task's work requires touching files outside the declared `Outputs:` AND outside the allow-list, you have two paths — pick based on your confidence:

**Path A — proceed with documented scope expansion.** Only when ALL of these hold:
1. The extra file is in the **same logical subsystem** as the declared Outputs (e.g., refactoring `src/brand-tokens/resolve.ts` while implementing `src/brand-tokens/resolve-asset.ts`; registering a new block in `src/schema/blocks/index.ts` while implementing a new block schema).
2. The change is **obviously necessary** (a sibling helper needs an export; an index union needs an entry).
3. You can explain it in **one short line per file**.

If all three hold, proceed AND include a `Scope expansion:` block in the commit body listing each extra file with a one-line rationale. Example:

```
T-22: implement resolveAssetPath

Adds the asset path resolver that handles both per-doc and brand-token refs.

Scope expansion:
- src/brand-tokens/resolve.ts — extracted lookupBrandPath() from resolveBrandToken
  so resolveAssetPath can reuse the brand-token lookup without duplicating.

Co-Authored-By: ...
```

Reviewers grep for `^Scope expansion:` in commit messages; if it's missing while the diff touches undeclared files, that's a protocol audit failure. The pre-commit hook does NOT enforce this (it can't parse the task's Outputs from markdown); discipline rests on the driver and is verified at step 8 self-check.

**Path B — halt with `[?]` for human guidance.** When the addition is non-obvious, cross-cuts boundaries, modifies files in a different subsystem (e.g., your block-renderer task wants to touch `src/schema/`), or you can't articulate the rationale in one line: mark the task `[?]` with reason `scope-ambiguous: needs <file> outside Outputs:` and continue to step 7 NEXT. The human will either update the task's `Outputs:` and unblock or restructure the task.

When in doubt, prefer Path B. A halted task that gets clarified once is cheaper than a quiet scope creep that compounds across a milestone.

## Step 3 — TEST

Run the relevant test command for the files just changed:
- `npm test -- <changed-paths>` for schema/renderer/component tests.
- `npm test` (full suite) for tasks affecting cross-cutting infrastructure (mapping, primitives, watchdog).

If failures, iterate up to **5 fix cycles**, re-running tests after each fix.

If still failing after 5 cycles:
- Revert working-tree changes for this task: `git checkout -- <files>`
- Change the marker from `[~]` back to `[?]` in TASKS.md with inline reason: `### T-NN [?] · Title  ← blocked: tests fail after 5 fixes — <one-line summary>`
- Append a detailed entry to `BLOCKERS.md` (see §BLOCKERS.md append).
- Regenerate STATUS.md.
- Stage `docs/TASKS.md`, `BLOCKERS.md`, `STATUS.md` (the three loop-managed files); commit + push with message `T-NN: block — tests failing`.
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

Run the single gate runner:

```
bash scripts/verify-gates.sh
```

This script is the single source of truth for project-wide gates. It runs (in order):
1. `tsc --noEmit` (project-wide typecheck)
2. `npm run lint`
3. `npm test` (full suite)

Pre-M0 escape: if `package.json` or `node_modules/` is absent, the script skips all gates with a warning and exits 0. T-01 / T-02 commits won't trip on this.

**The pre-commit hook (`scripts/verify-task-commit.sh`) invokes the same script on any commit that touches a TypeScript/JavaScript/Rust file OR represents a real loop transition.** That means even if you skip step 5 by accident, your commit cannot land if the gates fail. Don't rely on the hook as the only check — running step 5 here gives you the chance to fix issues before constructing a doomed commit.

If `verify-gates.sh` exits non-zero:
- Revert the working tree: `git checkout -- .`
- Mark the task `[?]` with reason matching whichever gate failed (`broke project-wide tsc`, `broke project-wide lint`, or `broke project-wide tests`).
- Append to BLOCKERS.md with the first 20 lines of the gate runner's failing output.
- Regenerate STATUS.md.
- Stage `docs/TASKS.md`, `BLOCKERS.md`, `STATUS.md`; commit + push.
- **This counts toward the A-rule consecutive `[?]` count.**
- Continue to step 7 NEXT.

If `verify-gates.sh` exits 0: continue to step 6.

For debugging when a gate fails non-obviously, run `GATES_VERBOSE=1 bash scripts/verify-gates.sh` to see full output instead of the first 30 lines.

## Step 6 — REGENERATE STATUS + COMMIT + PUSH

This is the single commit per task. It bundles the task's implementation with the loop-managed files.

1. Change the marker in `docs/TASKS.md` from `[~]` to `[x]` (suffix on the header line: `### T-NN [x] · Title`).
2. Regenerate `STATUS.md` to reflect this task's completion (see §STATUS.md regeneration). Include the `Running on:` line.
3. If `BLOCKERS.md` was mutated this fire (e.g., a `[!]` auto-promotion in the previous iteration's step 7), it's also on the stage list.
4. Stage explicitly (no `git add -A`, no `git add .`):
   - Each file listed in the task's `Outputs:` field
   - Any allow-list files this task touched (typically `package-lock.json`, `Cargo.lock`, Tauri icons on M0 init tasks)
   - `docs/TASKS.md`
   - `STATUS.md`
   - `BLOCKERS.md` (only if its on-disk state differs from `HEAD`)
5. Verify with `git diff --cached --name-only` that nothing outside `Outputs:` ∪ allow-list ∪ loop-managed-files is staged.
6. Commit with message format:

   ```
   T-NN: <subject from task title, lowercase first word>

   <1-3 lines: what changed and why>

   Tier: <model + effort>          ← REQUIRED if T-NN is on the escalation list
   Tier-mismatch acknowledged:     ← REQUIRED if Tier: is not an escalation tier
     <one-line reason>             (Opus 4.7 / GPT-5 Pro / Gemini 2.5 Pro Thinking)
   Scope expansion:                ← REQUIRED if you touched files outside Outputs
     - <path> — <one-line why>

   Co-Authored-By: <model-name> <noreply@anthropic.com>
   ```

   **The commit-msg hook (`scripts/verify-commit-msg.sh`) enforces the `Tier:` and `Tier-mismatch acknowledged:` lines for escalation-list tasks.** The escalation list lives in `scripts/escalation-list.txt` (mirrors §"Escalation tier" above). If the hook rejects your commit, either switch to an escalation-tier model OR add the acknowledgment line with a real reason. Don't bypass.

   For non-escalation tasks, the `Tier:` line is optional but encouraged — it makes the post-hoc audit trail richer when something goes sideways.

7. Do **not** amend previous commits. Do **not** use `--no-verify`. Do **not** include unrelated changes.
8. The pre-commit hook (`scripts/verify-task-commit.sh`) runs automatically and asserts the loop-managed-files invariant + the allow-list rule. If it rejects the commit: re-examine what's staged; do not bypass with `--no-verify`. If the hook is genuinely buggy, mark the task `[?]` with reason `hook-misfire: <hook error>` and halt to BLOCKED-NO-ELIGIBLE.
9. `git push origin main`.
10. If push rejected (non-fast-forward): `git pull --rebase origin main`, retry push **once**. If still rejected: this is the one true halt condition besides ALL DONE — mark task `[?]` with `push-conflict: needs manual rebase`, regenerate STATUS.md + append BLOCKERS.md, commit the loop-managed files as a separate small commit, halt to `PUSH-CONFLICT`. Stop the invocation.

## Step 6.5 — MILESTONE GATE CHECK (only when entering a new milestone)

If the task just completed was the **last `[ ]` task in its milestone** (all sibling tasks now `[x]` or `[skip]`):

- Run the milestone's full gate: `npm run build && npm test` plus any milestone-specific assertion in `docs/BUILD_BRIEF.md`.
- If gate passes: continue to step 7.
- If gate fails:
  - Mark the milestone header `[GATE FAILED]` in TASKS.md (e.g., `### Sub-phase 1A — Core schema [GATE FAILED]`).
  - Append a "## M1a — gate failed" entry to BLOCKERS.md listing every commit since the previous green gate as a suspect. Recommend `git bisect` to the human.
  - Regenerate STATUS.md.
  - Stage `docs/TASKS.md`, `BLOCKERS.md`, `STATUS.md`; commit + push.
  - Halt to `MILESTONE-GATE-FAILED`. Stop the invocation.

## Step 7 — NEXT

- If we just completed a task (`[x]`): nothing more to do here; STATUS.md was already committed in step 6. Loop back to step 1 (pick next).
- If we just blocked (`[?]`) or external-blocked (`[!]`):
  - Increment `[!]` auto-promotion counter for any `[!]` markers in BLOCKERS.md older than this fire's start time:
    - For each `[!]` entry in BLOCKERS.md, find the `**Fires unresolved:**` line. Increment by 1.
    - If counter reaches **3**: rewrite that task's marker in TASKS.md from `[!]` to `[?]` with appended reason `auto-promoted from [!] after 3 unresolved fires`. Update the BLOCKERS.md entry's marker line.
    - **These BLOCKERS.md and TASKS.md mutations are NOT committed here.** They'll be staged with the next task's step 6 commit (or with the next failure path's commit). The pre-commit hook will reject any commit that doesn't stage them, so they cannot drift.
  - Loop back to step 1 (try to pick next eligible task — halt rules will catch us if we should stop).

## Step 8 — SELF-CHECK (before exiting the invocation)

Before the invocation exits (any stop condition), output this checklist to chat:

```
Self-check before exit:
☐ Most recent commit on this branch stages STATUS.md? (verify: git show --name-only HEAD | grep -x STATUS.md)
☐ Most recent commit stages docs/TASKS.md with at most one marker transition?
☐ No files staged in any task commit outside Outputs: ∪ allow-list — OR if any are, the commit body has a `Scope expansion:` block per file?
☐ STATUS.md "Running on:" line names the model that actually executed this fire?
☐ No [~] markers left in docs/TASKS.md (use grep -n '\[~\]' docs/TASKS.md)?
☐ All loop-managed file mutations from this fire are committed (git status is clean)?
```

For each unchecked item, append a one-line explanation to chat (and to BLOCKERS.md if it represents a protocol violation that survived the hook). Self-checking honestly is more valuable than passing — the human reads this to gauge trust.

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
**Running on:** <model name> at <effort>  (or "(effort unknown)")
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

Self-check: <PASS | N items flagged — see chat>

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
- **Never bypass hooks** (`--no-verify`, `--no-gpg-sign`). The pre-commit hook is the safety net; bypassing it is a worse offense than whatever the hook was rejecting.
- **Never use `git add -A` or `git add .`** — always explicit paths.
- **Never stage files outside `Outputs:` ∪ allow-list ∪ loop-managed-files** without explicit reasoning in the commit body. The hook enforces this.
- **Never commit changes to loop-managed files in isolation.** If `docs/TASKS.md` or `BLOCKERS.md` has uncommitted changes, the matching `STATUS.md` regeneration must be in the same commit (or the next commit, if a fire was interrupted — pre-flight #7 handles that). The hook enforces this.
- **Never silently adjust DECISIONS.md targets** when a perf or quality gate fails — file the regression as a blocker; let the human decide whether to relax the target.
- **Never delete BLOCKERS.md entries.** Append-only.
- **Never start work without a clean pre-flight.**
- **Never write `[~]` to TASKS.md and not commit it the same fire.** Pre-flight #7 catches stale `[~]` on cold start; don't rely on it for graceful exits — finish the task, block it, or revert the marker.
