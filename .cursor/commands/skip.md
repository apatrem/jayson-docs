---
description: Permanently mark a task as not-to-do; updates TASKS.md, commits, pushes
argument-hint: T-NN <one-line reason>
---

You are marking a task as deliberately skipped. The `[skip]` marker tells `/next-task` to treat the task like `[x]` for dependency-eligibility purposes but distinguishes it from completed work in `/status`.

# Steps

## 1. Parse arguments

The user invokes as `/skip T-NN <reason text>`. Parse:
- Task ID: must match pattern `T-\d+[a-z]?` (e.g. `T-32`, `T-89c`).
- Reason: free text after the ID. Must be non-empty.

If parsing fails: emit a usage hint and stop. Do not modify anything.

## 2. Verify pre-conditions

- Pre-flight checks 1–5 from `/next-task` must all pass:
  - Branch is `main`
  - Working tree clean
  - `HEAD` == `origin/main` (after `git fetch`)
  - Required files exist
  - `node_modules/` or no `package.json`

If any check fails: emit the failure and stop. Do not modify TASKS.md.

## 3. Find and update the task

- Read `docs/TASKS.md`.
- Find the task heading matching `### T-NN [<marker>] ·` (marker placement is suffix on the header line, between the task ID and the `·` separator).
- Read the current marker (must be one of `[ ]`, `[?]`, `[!]`). If the current marker is `[x]`, `[~]`, or `[skip]`: emit "task is already <marker>, no action taken" and stop.
- Replace the marker with `[skip]` in the header line: `### T-NN [skip] · Title`.
- Append a `**[SKIPPED]:** <reason>  (<ISO-8601 date>)` line below the task title.

## 4. Cascade update — dependent tasks

- Scan all tasks in TASKS.md whose `- **Depends-on:**` field lists the skipped task ID.
- For each dependent task currently in `[ ]` / `[?]` / `[!]` state: do **NOT** auto-skip — emit a list in the chat output ("Tasks depending on T-NN: T-PP, T-QQ — review and `/skip` individually if appropriate").

## 5. Clear any blocker entries

- If `BLOCKERS.md` contains an entry for T-NN: append a resolution line `**Resolved:** skipped by user at <ISO-8601 date>. Reason: <reason>.`
- Do NOT delete the BLOCKERS.md entry (append-only).

## 6. Regenerate STATUS.md, commit + push

- Regenerate `STATUS.md` to reflect the new skip (per `/next-task`'s §STATUS.md regeneration). The skipped task counts toward the "Skipped" total at-a-glance line.
- Stage the loop-managed files: `docs/TASKS.md`, `STATUS.md`, and `BLOCKERS.md` (only if modified).
- Commit message:

  ```
  T-NN: skip — <reason>

  Marked deliberately skipped. See TASKS.md for context.

  Co-Authored-By: <model-name> <noreply@anthropic.com>
  ```

- The pre-commit hook (`scripts/verify-task-commit.sh`) runs and asserts the loop-managed-files invariant. Do not bypass.
- `git push origin main`. If rejected: emit the conflict and stop (do not force-push).

## 7. Report

```
✅ T-NN marked [skip].
Reason: <reason>
Dependent tasks (review manually): T-PP, T-QQ, ...

Next /next-task fire will treat T-NN as completed for dependency purposes.
```

# Rules

- Never modify multiple tasks in one invocation. One `T-NN` per `/skip` call.
- Never delete BLOCKERS.md entries — only append the resolution line.
- Never cascade-skip dependents automatically — that requires deliberate human judgment per task.
- Never force-push.
- Never commit unrelated changes — stage only TASKS.md and (if modified) BLOCKERS.md.

# Examples

```
/skip T-46c lint extension already covers what this would have done
/skip T-103 deck path moved to v1.1 per pilot feedback
/skip T-89d watchdog adversarial test deferred — using manual chaos-monkey instead
```
