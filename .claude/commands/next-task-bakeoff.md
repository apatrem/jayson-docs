---
description: Bake-off variant of /next-task — implement T-01..T-05 on a local-only bakeoff/* branch; no push, no fetch, no CI-poll
---

You are an autonomous task runner driving a **model bake-off** on a local-only branch named `bakeoff/<driver>` or `bakeoff/<driver>-vN`. One invocation = one or more tasks, ending after **T-05** is marked `[x]` (`BAKEOFF_COMPLETE`) or a halt rule trips.

**Operating principle: be conservative.** Default action when something is wrong is to *halt cleanly* with a clear `STATUS.md` and `BLOCKERS.md` entry. Never force-push. Never commit unrelated changes. Never silently regress.

**Bake-off invariants (different from production `/next-task`):**

- **Local-only.** Never `git push`, never `git fetch`, never `git pull`. The branch has no upstream.
- **Restricted task range.** Only T-01 through T-05. Stop on `BAKEOFF_COMPLETE` after T-05 is `[x]`.
- **Branch guard.** Refuse to run on `main`. The current branch MUST start with `bakeoff/`.
- **No CI-poll.** This is an offline experiment; no remote state to check.

The goal is to produce a clean 5-commit history on this branch so the human can compare it side-by-side with the same branch produced by other LLMs.

---

# Model and effort tier (read this before doing anything)

This loop's quality depends on the model and reasoning-effort tier running it. The human picks the right combination in their chat app before issuing the bake-off command. If you are an LLM reading this spec: confirm your tier matches the recommendation below; if you cannot tell what tier you are running at, assume the default tier and proceed with extra care on long procedural steps (every pre-flight check, every halt-rule arithmetic step, every STATUS.md regeneration).

## Default tier — handles ~90% of tasks

| App | Model | Effort / Thinking budget |
|---|---|---|
| Claude Code | Claude Sonnet 4.6 | **high** |
| Cursor (Composer) | Claude Sonnet 4.6 | **max thinking** |
| Cursor (Composer) | GPT-5 | **high** reasoning |
| Codex desktop / ChatGPT | GPT-5 | "Think harder" / high reasoning |

## Escalation tier — only fires if a task gets `[?]`'d and is being retried

| App | Stronger model | Effort |
|---|---|---|
| Claude Code | Claude Opus 4.7 | **xhigh** |
| Cursor (Composer) | Claude Opus 4.7 | **max thinking** |
| Codex / ChatGPT | GPT-5 Pro | "Think harder" + xhigh |

For T-01..T-05 (all default-tier M0 scaffolding), the escalation tier should not fire under normal conditions. If you find yourself escalating, that itself is a useful data point for the bake-off — record it.

## Tiers that should NOT run this loop

This spec is conservative procedural protocol. Models without sufficient reasoning budget *will* skip steps. Avoid:

- Claude Sonnet/Haiku at **medium** or **default** effort
- Claude Haiku at any effort
- GPT-5 at **low** or **default** reasoning
- GPT-4o / GPT-4-turbo
- Cursor "Composer 1", "fast", "cmd-k-fast"
- Any model where the reasoning-effort budget cannot be set explicitly

**Cursor auto mode is an exception for this bake-off.** The bake-off deliberately includes Cursor's auto mode as a data point — let it route as it sees fit. If you are running under Cursor auto and suspect you've been routed to a fast variant: still write the STATUS.md tier line honestly so the human can see what auto picked.

If you are an LLM reading this spec and you suspect you are in a truly unfit tier (small parameter count, no extended thinking, ≤4k effective reasoning budget): write a `BOOT-CHECK-FAILED` STATUS.md with state `TIER-TOO-LOW` listing your model name, and stop the invocation. The human will switch model and re-fire.

## Self-reporting in STATUS.md

On every fire's STATUS.md regeneration, include these lines near the top:

```
Running on: <model name> at <effort>  (or "(effort unknown)" if undetectable)
Driver branch: <current branch>
```

This is the canonical "what model produced this commit" record for the bake-off comparison.

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

The loop owns these files. Any change to any of them must be staged in the next commit; the pre-commit hook enforces this on `bakeoff/*` branches.

| File | Role | When mutated |
|---|---|---|
| `docs/TASKS.md` | Source of truth for what's done | Every block, every completion |
| `STATUS.md` | Auto-regenerated dashboard | Every fire (regenerated in step 6 before committing) |
| `BLOCKERS.md` | Append-only audit log | Failure paths, `[!]` auto-promotion |

---

# Allow-list — files that may be staged outside `Outputs:`

The hard rule is **deny-by-default**: a task commit may only stage files declared in its `Outputs:` field. Exceptions for these specific paths that exist for reproducibility:

```
- package-lock.json       (root only — committed when T-01 runs npm install)
- */Cargo.lock            (any nested Rust crate — application crates lock their deps; T-02)
- src-tauri/icons/*.png   (Tauri-init defaults; T-02)
- src-tauri/icons/*.ico
- src-tauri/icons/*.icns
- .gitignore              (only when ADDING patterns)
- docs/TASKS.md           (loop-managed; always allowed)
- STATUS.md               (loop-managed; always allowed)
- BLOCKERS.md             (loop-managed; always allowed)
```

Anything else outside the current task's `Outputs:` is a protocol violation. The pre-commit hook fails the commit.

---

# Pre-flight checks (run at start of every invocation; halt to `BOOT-CHECK-FAILED` on any failure)

1. Current branch starts with `bakeoff/`. (`git rev-parse --abbrev-ref HEAD`). **NEVER run this on `main`.**
2. Working tree is clean — no unstaged or staged changes. (`git status --porcelain` is empty)
3. The bake-off start tag exists. For v1 branches (`bakeoff/<driver>`): tag `bakeoff-start`. For v2+ branches (`bakeoff/<driver>-vN`): tag `bakeoff-start-vN` matching the suffix. If missing: halt to `BOOT-CHECK-FAILED` with message "run scripts/bakeoff-setup.sh --version vN first."
4. Required files exist: `docs/TASKS.md`, `docs/DECISIONS.md`, `docs/BUILD_BRIEF.md`, `AGENTS.md`, `starter/package.json`.
5. `node_modules/` exists OR no `package.json` at repo root (pre-M0 case is fine).
6. The pre-commit hook is installed: `.git/hooks/pre-commit` is a symlink (or copy) of `scripts/verify-task-commit.sh`. If missing or outdated, run `bash scripts/install-hooks.sh` automatically and continue.
7. No `[~]` markers anywhere in `docs/TASKS.md`. If found:
   - Discard any uncommitted changes: `git checkout -- .`
   - Change the `[~]` marker back to `[ ]` in `docs/TASKS.md`
   - Regenerate STATUS.md to reflect the reset
   - Append an entry to `BLOCKERS.md`: `## T-NN — was [~] on cold start; auto-reverted. Task will be re-attempted.`
   - Commit (local only — NO push) the loop-managed file changes with message `T-NN: reset stale [~] marker`
   - **Continue to step 1** (do not halt — strict reset is recovery, not failure)

If any check fails (except #6 and #7, which auto-recover), regenerate `STATUS.md` with `BOOT-CHECK-FAILED` state listing the failed check, then stop the invocation. The next loop fire will re-run pre-flight; if conditions cleared, work resumes.

---

# Main loop steps

Repeat steps 1–8 in the same invocation until a stop condition fires.

## Step 1 — PICK

Read `docs/TASKS.md`. Find the lowest-numbered task with marker `[ ]` whose `Depends-on:` field is either `none` or a comma-separated list of T-NNs that are ALL `[x]` or `[skip]`. **Only T-01 through T-05 are in scope for this bake-off — refuse to pick anything else.**

**Check halt rules before claiming:**
- **A-rule:** look at the last 2 tasks in T-01..T-05 with markers in `{[x], [?], [skip]}`. If both are `[?]`: halt to `A-RULE-HALT`.
- **C-rule:** the current milestone is M0 (T-01..T-09). If the M0 header has `[GATE FAILED]` OR if any task in M0 (within T-01..T-05) has marker `[?]`: halt to `C-RULE-HALT`.
- **Bake-off stop:** if T-05 is already `[x]`: stop with `BAKEOFF_COMPLETE`. Regenerate STATUS.md (commit it as a final standalone commit since no task body accompanies it).

If no candidate task exists:
- If T-01..T-05 all `[x]` or `[skip]`: stop with `BAKEOFF_COMPLETE`.
- If `[?]`/`[!]` blocks remain in T-01..T-05 but no eligible `[ ]`: halt to `BLOCKED-NO-ELIGIBLE`.

If a candidate task exists and halt rules pass:
- Change its marker from `[ ]` to `[~]` in `docs/TASKS.md` (suffix on the header line: `### T-NN [~] · Title`).
- **Do NOT commit yet.** The marker change lives in the working tree until step 6 bundles it with the task's `Outputs:` and the regenerated STATUS.md.

> **Why no claim commit?** Earlier versions committed the `[~]` marker separately as a "claim" before implementing. The v1 bake-off methodology that produced this spec showed drivers naturally collapse claim + implementation into one commit when allowed to — so we made one commit the rule. Crash recovery still works: pre-flight #7 finds the stale `[~]` on disk and resets it.

## Step 2 — IMPLEMENT

- Read the task's `Reads:` files (file paths, doc references, `D-NN` decisions).
- Read any `DECISIONS.md` entries referenced by ID in `Reads:`.
- Copy from `starter/` for M0 tasks (T-01 uses package.json/tsconfig/vite/vitest configs; T-02 uses src-tauri).
- Write/edit only files listed in the task's `Outputs:` field, plus the allow-list. Do not modify unrelated files.

**Auto-recover** on these common issues without halting:
- Missing imports → add them.
- Type errors → fix them.
- Lint violations → fix or auto-format with prettier.
- Missing test fixtures the task expects → create from `examples/` patterns.

If the task's work requires touching files outside the declared `Outputs:` AND outside the allow-list: mark the task `[?]` with reason `scope-ambiguous: needs <file> outside Outputs:` and continue to step 7 NEXT.

## Step 3 — TEST

Run the relevant test command for the files just changed:
- `npm test -- <changed-paths>` for tests added/changed by this task
- `npm test` (full suite) if the task scope is cross-cutting

If failures, iterate up to **5 fix cycles**, re-running tests after each fix.

If still failing after 5 cycles:
- Revert working-tree changes for this task: `git checkout -- <files>`
- Change the marker from `[~]` back to `[?]` in TASKS.md with inline reason: `### T-NN [?] · Title  ← blocked: tests fail after 5 fixes — <one-line summary>`
- Append a detailed entry to `BLOCKERS.md` (see §BLOCKERS.md append).
- Regenerate STATUS.md.
- Stage `docs/TASKS.md`, `BLOCKERS.md`, `STATUS.md`; commit (local only — NO push) with message `T-NN: block — tests failing`.
- **Continue to step 7 NEXT** (loop will re-evaluate halt rules at next pick).

## Step 4 — REVIEW (inline self-review)

Re-read the files just changed against:
- The task's `Acceptance:` criteria.
- `starter/.eslintrc.cjs` architectural invariants: no hard-coded hex colors in `src/renderer/blocks/` or `src/block-primitives/`; no `dangerouslySetInnerHTML`; no `eval` / `new Function`.

Correctness or security violations: fix and re-run TEST. Style-only nits: note in commit body, don't block.

## Step 5 — GLOBAL QUALITY GATES (β)

Run, in order:
1. `tsc --noEmit` (project-wide typecheck) — only if `tsconfig.json` exists and `node_modules` is present
2. `npm run lint` — only if the script is defined in `package.json`

For T-01 (initialize repo), neither command exists yet — skip gracefully and note in STATUS.md "gates skipped — pre-M0 init."

If either gate fails (when applicable):
- Revert the working tree: `git checkout -- .`
- Mark the task `[?]` with reason `broke project-wide tsc` or `broke project-wide lint`.
- Append to BLOCKERS.md with the first 20 lines of the error output.
- Regenerate STATUS.md.
- Stage `docs/TASKS.md`, `BLOCKERS.md`, `STATUS.md`; commit (local only).
- **This counts toward the A-rule consecutive `[?]` count.**
- Continue to step 7 NEXT.

If both pass (or both not applicable): continue to step 6.

## Step 6 — REGENERATE STATUS + COMMIT (local only — NO push)

This is the single commit per task. It bundles the task's implementation with the loop-managed files.

1. Change the marker in `docs/TASKS.md` from `[~]` to `[x]` (suffix on the header line: `### T-NN [x] · Title`).
2. Regenerate `STATUS.md` to reflect this task's completion (see §STATUS.md regeneration). Include the `Running on:` and `Driver branch:` lines.
3. If `BLOCKERS.md` was mutated this fire (e.g., a `[!]` auto-promotion in the previous iteration's step 7), stage it.
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

   Bake-off branch: <current branch>
   Co-Authored-By: <model-name> <noreply@anthropic.com>
   ```

7. Do **not** amend previous commits. Do **not** use `--no-verify`. Do **not** include unrelated changes.
8. The pre-commit hook (`scripts/verify-task-commit.sh`) runs automatically and asserts the loop-managed-files invariant + the allow-list rule. If it rejects the commit: re-examine what's staged; do not bypass with `--no-verify`.
9. **DO NOT `git push`.** This branch is local-only by design.

## Step 6.5 — MILESTONE GATE CHECK — SKIPPED in bake-off

The bake-off only runs T-01..T-05, which is the first half of M0. The full M0 gate (T-01..T-09) is not yet possible because T-06..T-09 haven't run. **Skip this step entirely.** The post-bake-off comparison runs its own validation via `scripts/verify-bakeoff-v2.sh`.

## Step 7 — NEXT

- **If T-05 was just marked `[x]`:** stop with `BAKEOFF_COMPLETE`. Final invocation report includes total wall-clock + commit count.
- **If we just completed a non-T-05 task (`[x]`):** STATUS.md was already committed in step 6. Loop back to step 1 (pick next).
- **If we just blocked (`[?]`) or external-blocked (`[!]`):**
  - Increment `[!]` auto-promotion counter for any `[!]` markers in BLOCKERS.md older than this fire's start time:
    - For each `[!]` entry in BLOCKERS.md, find the `**Fires unresolved:**` line. Increment by 1.
    - If counter reaches **3**: rewrite that task's marker in TASKS.md from `[!]` to `[?]` with appended reason `auto-promoted from [!] after 3 unresolved fires`. Update the BLOCKERS.md entry's marker line.
    - **These BLOCKERS.md and TASKS.md mutations are NOT committed here.** They'll be staged with the next task's step 6 commit (or with the next failure path's commit).
  - Loop back to step 1 (try to pick next eligible task — halt rules will catch us if we should stop).

## Step 8 — SELF-CHECK (before exiting the invocation)

Before the invocation exits (any stop condition), output this checklist to chat:

```
Self-check before exit:
☐ Most recent commit on this branch stages STATUS.md? (verify: git show --name-only HEAD | grep -x STATUS.md)
☐ Most recent commit stages docs/TASKS.md with at most one marker transition?
☐ No files staged in any task commit outside Outputs: ∪ allow-list?
☐ STATUS.md "Running on:" line names the model that actually executed this fire?
☐ STATUS.md "Driver branch:" line matches `git rev-parse --abbrev-ref HEAD`?
☐ No [~] markers left in docs/TASKS.md (grep -n '\[~\]' docs/TASKS.md)?
☐ All loop-managed file mutations from this fire are committed (git status is clean)?
☐ Zero `git push` attempts in this invocation? (bake-off is local-only)
```

For each unchecked item, append a one-line explanation to chat (and to BLOCKERS.md if it represents a protocol violation that survived the hook).

# Stop conditions (this invocation exits)

Only these terminate the invocation:
1. **BAKEOFF_COMPLETE** — T-05 marked `[x]`. Success terminal state.
2. **A-RULE-HALT** — 2 consecutive `[?]` markers in T-01..T-05.
3. **C-RULE-HALT** — M0 milestone has `[?]` marker within T-01..T-05.
4. **BOOT-CHECK-FAILED** — pre-flight failed (e.g., on `main`, dirty tree, missing tag).
5. **BLOCKED-NO-ELIGIBLE** — `[?]`/`[!]` exist in T-01..T-05 but no eligible `[ ]` can be picked.

The production-only stop conditions (`ALL DONE`, `PUSH-CONFLICT`, `MILESTONE-GATE-FAILED`, `CI-FAILED`) do **not** apply to the bake-off variant.

Each terminal state writes the matching STATUS.md and exits cleanly.

---

# STATUS.md regeneration (every fire, on every state change)

Rewrite `STATUS.md` at repo root, replacing existing content. Use this exact template:

```markdown
# Loop status — auto-generated; do not edit (bake-off variant)

**Last fire:** <ISO-8601 UTC>
**State:** <RUNNING | HALTED | BAKEOFF_COMPLETE | BOOT-CHECK-FAILED>
**Driver branch:** <current branch>
**Running on:** <model name> at <effort>  (or "(effort unknown)")
**Halt reason:** <one-line, only if HALTED>
**Halted since:** <ISO-8601 UTC, only if HALTED>

---

## What needs your attention (only when HALTED)

<List blockers in priority order. For each:>
1. **T-NN** — `[?]` <one-line reason>
   → BLOCKERS.md §T-NN

## Next eligible task (when human unblocks)

<T-MM and its title, or "none — all blockers must clear">

## Progress this fire

- ✅ <N> tasks completed: <task IDs>
- ⚠ <N> tasks blocked: <task IDs>
- ⏸ <N> tasks marked waiting: <task IDs>

## Bake-off scope (T-01..T-05)

T-01: <marker>
T-02: <marker>
T-03: <marker>
T-04: <marker>
T-05: <marker>

## Recent commits (this branch)

<git log --oneline <bake-off-start-tag>..HEAD>
```

When state is `BAKEOFF_COMPLETE`: also emit the section "Bake-off complete — ready for human comparison. See BAKEOFF.md for comparison rubric and `scripts/verify-bakeoff-v2.sh` for the binary checklist."

---

# BLOCKERS.md append rules (when a `[?]` or `[!]` is created)

Open `BLOCKERS.md` at repo root. Append (never rewrite):

```markdown
## T-NN — <task subject>
**Status:** [?] or [!]
**Detected at:** <ISO-8601 UTC>
**Driver branch:** <current branch>
**Running on:** <model name> at <effort>
**Fires unresolved:** 0     (only for [!]; increments per fire until auto-promotion)
**Reason:** <one paragraph>
**Last attempt:** <commit SHA or "no commit — reverted">
**Suggested action for human:**
- <bullet>
- <bullet>

---
```

For T-01..T-05 (M0 scaffolding), include: "Task is M0 scaffolding; if it's blocked here, the spec, starter/ files, or the model's understanding of the spec likely needs review."

Never delete entries — the human is responsible for deleting resolved entries after fixing the underlying issue.

---

# Final invocation report (chat output, after the invocation exits)

```
<State emoji + STATE>

Driver branch: <current branch>
Running on:    <model> at <effort>

Completed this invocation: <N tasks: T-AA, T-BB, ...>
Blocked this invocation:   <N: T-CC ([?]), T-DD ([!])>

Bake-off scope:  T-01..T-05
Bake-off status: <how many of the 5 are [x]>

Self-check: <PASS | N items flagged — see chat>

Next: <one-liner — BAKEOFF_COMPLETE | what the next fire will try | what the human must do>
```

Examples:

- `🏁 BAKEOFF_COMPLETE — 5/5 tasks done on bakeoff/claude-v2. Hand off to human for comparison.`
- `🛑 A-RULE-HALT on bakeoff/cursor-v2 — T-02, T-03 both [?]. See BLOCKERS.md.`
- `▶ RUNNING — completed 2 tasks (T-01, T-02) on bakeoff/gpt5-v2. Next fire will pick T-03.`

---

# Hard rules (never violate)

- **Never `git push`.** This branch is local-only.
- **Never `git fetch` or `git pull`.** No remote interaction.
- **Never force-push.** (Moot since no push, but the rule stands.)
- **Never amend** existing commits. New commits only.
- **Never bypass hooks** (`--no-verify`, `--no-gpg-sign`). The pre-commit hook is the safety net; bypassing it is a worse offense than whatever it was rejecting.
- **Never use `git add -A` or `git add .`** — always explicit paths.
- **Never stage files outside `Outputs:` ∪ allow-list ∪ loop-managed-files** without explicit reasoning in the commit body. The hook enforces this.
- **Never commit changes to loop-managed files in isolation.** If `docs/TASKS.md` or `BLOCKERS.md` has uncommitted changes, the matching `STATUS.md` regeneration must be in the same commit.
- **Never silently adjust DECISIONS.md targets** — file the regression as a blocker.
- **Never delete BLOCKERS.md entries.** Append-only.
- **Never start work without a clean pre-flight.**
- **Never run on `main`.** Refuse the invocation if pre-flight check #1 fails.
- **Never touch tasks outside T-01..T-05** during this bake-off.
- **Never write `[~]` to TASKS.md and not commit it the same fire.**
