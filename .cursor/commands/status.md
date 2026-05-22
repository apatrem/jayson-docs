---
description: Read-only status snapshot — does not modify any file, no git commands beyond log/status
---

You are reporting the current state of the autonomous task loop. **Read-only operation. Do not modify any file. Do not commit. Do not push.**

# Steps

1. Read `STATUS.md` at repo root.
2. Read `BLOCKERS.md` at repo root (count entries with non-deleted markers).
3. Run `git log --oneline -8` to get recent commits.
4. Run `git status --porcelain` to detect any uncommitted user edits (if any: surface them in the report — they're blocking the next fire).
5. Run `grep -c '\[~\]' docs/TASKS.md` — if non-zero, the previous fire left stale claim markers (pre-flight #7 will auto-recover on the next fire; surface for visibility).
6. Run `git log -1 --name-only | grep -x STATUS.md` — if the most recent commit doesn't include STATUS.md, flag a protocol violation (previous fire may have skipped the bundled-staging rule).
7. (Optional) If `AGENTS.md` has `loop.ci-poll: true`, run `gh run list --branch main --limit 1 --json conclusion --jq '.[0].conclusion'`. If `gh` is missing, skip.

# Output format

Emit this verbatim in the chat (no extra commentary):

```
# Loop status

State:        <from STATUS.md>
Last fire:    <from STATUS.md>
Running on:   <from STATUS.md "Running on:" line>
Halted:       <yes (since X) | no>

Progress:     <Done / Total> (<%>)
Blockers:     <N [?]> / <N [!]>
Skipped:      <N>
Stale [~]:    <N (auto-recovers on next fire) | 0>

Recent commits:
  <git log --oneline -8>

Protocol health:
  - Last commit stages STATUS.md: <yes | NO — possible spec drift>
  - Pre-commit hook installed:    <yes | no (run bash scripts/install-hooks.sh)>

CI on origin/main: <green | red | unknown>

Working tree: <clean | DIRTY — uncommitted changes detected, see below>
<git status output if dirty>

Open blockers (from BLOCKERS.md):
  - T-NN: <first line of Reason>
  - ...

Next fire will attempt: <next eligible task from STATUS.md>
```

# Rules

- This command is read-only. No `Write`, `Edit`, or destructive `Bash` calls.
- If `STATUS.md` doesn't exist: emit `State: NEVER RUN (no STATUS.md found — first invocation pending)`.
- If `BLOCKERS.md` doesn't exist: emit `Open blockers: none`.
- Do not regenerate STATUS.md from this command — that's `/next-task`'s job.
- If the user has uncommitted changes, call it out clearly — the next `/next-task` fire will fail pre-flight on a dirty tree.

# Failure modes

- If `gh` is missing and CI-poll is on: report `CI on origin/main: unknown (gh not installed)`.
- If git commands fail (e.g., not a git repo): report the error and exit.
- Never halt, never block — this is a diagnostic command.
