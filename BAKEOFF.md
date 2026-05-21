# Model bake-off: T-01..T-05 across 3 drivers

**Purpose:** empirically pick the driver model/effort tier for the autonomous task loop by running the same first 5 tasks through three LLMs and comparing the resulting branches.

**Companion to:** `.claude/commands/next-task-bakeoff.md`, `scripts/bakeoff-setup.sh`.

---

## Why this exists

`docs/TASKS.md` contains ~120 tasks. Picking the wrong driver wastes weeks of LLM quota on subtly broken commits. The bake-off costs about one day of any single tier's weekly cap and replaces theory with empirical results.

Three drivers run the same first 5 tasks (M0 scaffolding — T-01..T-05) on their own **local-only** branch:

- `bakeoff/claude` — Claude Code, Sonnet 4.6 high (escalates to Opus 4.7 xhigh on retry)
- `bakeoff/cursor` — Cursor, auto mode (mostly Composer 2.5)
- `bakeoff/gpt5` — Codex desktop, GPT-5 high (escalates to xhigh on retry)

T-01..T-05 are all default-tier tasks. Escalation only fires if a task gets `[?]`'d and is retried by the human. Each driver's STATUS.md self-reports the model and effort it actually ran, so the human can audit what `cursor auto` picked vs. what was specified.

---

## Setup (run once)

```bash
# From the repo root, on main, with a clean tree:
bash scripts/bakeoff-setup.sh
```

The script (default mode):
- Verifies you're on `main` with a clean tree.
- Tags current `HEAD` as `bakeoff-start` (used by `next-task-bakeoff` for crash recovery).
- Creates three local branches off `HEAD`: `bakeoff/claude`, `bakeoff/cursor`, `bakeoff/gpt5`.
- **Creates three git worktrees** (sibling directories) so each driver app can operate on its own checkout in parallel.
- Switches back to `main` in the primary worktree.
- Prints next-step instructions.

By default this produces a directory layout like:

```
~/Documents/
  ├── jayson-docs/             ← primary worktree (main); compare from here
  ├── jayson-docs-claude/      ← worktree on bakeoff/claude
  ├── jayson-docs-cursor/      ← worktree on bakeoff/cursor
  └── jayson-docs-gpt5/        ← worktree on bakeoff/gpt5
```

All four directories share the same `.git`. Commits made in any worktree are visible to all the others. **Each app opens a different folder**, so they can't fight over which branch is checked out.

Verify:

```bash
git branch --list 'bakeoff/*' -v
git tag --list 'bakeoff-start'
git worktree list
```

You should see three branches, one tag, and four worktrees (main + 3 bake-off). Branches are **local-only** — no `git push` happens. None of the bake-off activity touches `main` or `origin`.

### Why parallel (and how to opt out)

The three desktop apps (Claude Code, Cursor, Codex) all read the file system. Without worktrees, they'd fight over a single checkout — only one branch can be active at a time. Worktrees give each app its own folder + branch, so all three can run simultaneously. The bake-off finishes in ~1 hour instead of ~3 hours.

If you'd rather run sequentially (one app at a time, checking out branches in turn):

```bash
bash scripts/bakeoff-setup.sh --no-worktrees
```

Then switch branches manually between drivers (the original setup behavior).

### Custom worktree location

Worktrees default to siblings of the main repo. Override with the `WORKTREE_BASE` environment variable:

```bash
WORKTREE_BASE=/tmp/bakeoff bash scripts/bakeoff-setup.sh
```

---

## Driver 1: Claude Code

**Model + effort:** Sonnet 4.6 + thinking budget = high  
**Escalation rule:** if any of T-01..T-05 gets `[?]`'d, switch the chat model to Opus 4.7 + xhigh, mark the task back to `[ ]` in TASKS.md, and re-fire.

**Open Claude Code in the dedicated worktree:**

```
~/Documents/jayson-docs-claude/
```

(The worktree is already on `bakeoff/claude` — no `git checkout` needed.)

In Claude Code:
1. Open the folder above as the working directory.
2. In the model picker: select **Claude Sonnet 4.6**.
3. Set thinking budget: **high**.
4. Run `/next-task-bakeoff` once manually to validate the protocol.
5. Inspect the resulting commit: T-01 should be marked `[x]`, the commit message starts with `T-01:`, `STATUS.md` was regenerated with a `Running on:` line that shows Sonnet 4.6 + high.
6. If clean: `/loop 30m /next-task-bakeoff` (or invoke `/next-task-bakeoff` manually four more times).

**Expected outcome:** 5 commits on `bakeoff/claude` (T-01..T-05), STATUS.md state = `BAKEOFF_COMPLETE`.

**(Sequential mode without worktrees: `git checkout bakeoff/claude` in the main repo before running.)**

---

## Driver 2: Cursor in auto mode (mostly Composer 2.5)

**Model + effort:** auto — Cursor routes as it sees fit; usually Composer 2.5.  
**Escalation rule:** if any of T-01..T-05 gets `[?]`'d, manually pin the chat model to Sonnet 4.6 + max thinking or Opus 4.7 + max thinking, mark the task back to `[ ]`, and re-send.

**Open Cursor in the dedicated worktree:**

```
~/Documents/jayson-docs-cursor/
```

(The worktree is already on `bakeoff/cursor` — no `git checkout` needed.)

In Cursor:
1. Open the folder above as a project.
2. Open Composer (or the agent chat).
3. **Model: auto** — do not pin a specific model. Cursor's auto mode is the data point being tested.
4. Paste the entire contents of `.claude/commands/next-task-bakeoff.md` as the system instructions for the chat (Composer's "Background" / system-prompt slot, or the first message if no dedicated slot exists).
5. Send: `Begin. Run the protocol on this branch. Stop when T-05 is [x].`
6. Re-invoke "Continue" if Composer pauses between tasks.

**Expected outcome:** 5 commits on `bakeoff/cursor`, STATUS.md state = `BAKEOFF_COMPLETE`. The `Running on:` line records which model auto actually picked — that's the most interesting data point for this driver.

**If Cursor's auto routes you to a fast variant** that the protocol's `Tiers that should NOT run this loop` list rejects: the slash command will halt to `BOOT-CHECK-FAILED` with state `TIER-TOO-LOW`. That's also useful information — it tells you auto is unsafe for this workload.

**(Sequential mode without worktrees: `git checkout bakeoff/cursor` in the main repo before opening Cursor.)**

---

## Driver 3: Codex desktop with GPT-5

**Model + effort:** GPT-5 + reasoning effort = high  
**Escalation rule:** if any of T-01..T-05 gets `[?]`'d, switch effort to **xhigh** for the retry.

**Open Codex desktop in the dedicated worktree:**

```
~/Documents/jayson-docs-gpt5/
```

(The worktree is already on `bakeoff/gpt5` — no `git checkout` needed.)

In Codex desktop:
1. Open the folder above as a workspace (Codex has native filesystem access).
2. Model: **GPT-5**.
3. Reasoning effort: **high**.
4. Paste the entire contents of `.claude/commands/next-task-bakeoff.md` as the system instructions for the session.
5. Send: `Begin. Run the protocol on this branch. Stop when T-05 is [x].`
6. Re-invoke "Continue" if Codex pauses between tasks.

**Expected outcome:** 5 commits on `bakeoff/gpt5`, STATUS.md state = `BAKEOFF_COMPLETE`.

**(Sequential mode without worktrees: `git checkout bakeoff/gpt5` in the main repo before opening Codex.)**

---

## Running all three in parallel

With worktrees enabled (default), launch the three apps simultaneously:

1. **Window 1:** open Claude Code on `~/Documents/jayson-docs-claude/`, configure model, run `/next-task-bakeoff`.
2. **Window 2:** open Cursor on `~/Documents/jayson-docs-cursor/`, paste system prompt, send "Begin."
3. **Window 3:** open Codex on `~/Documents/jayson-docs-gpt5/`, paste system instruction, send "Begin."

All three commit to their own branches independently. The shared `.git` (back at `~/Documents/jayson-docs/`) sees all three branches diverge in real time. When all finish, run the comparison commands from `~/Documents/jayson-docs/` on `main`.

**Don't make manual git changes in the main worktree while the bake-off is running** — leave it alone until all three drivers finish. If you need to inspect mid-run, use `git -C ~/Documents/jayson-docs-claude/ log --oneline` etc. from any terminal.

---

## Comparison rubric

After all three drivers complete (or one halts), score each branch on five dimensions. Open three terminals (one per branch) or use the commands in the next section.

### 1. Completion (binary + count)

- All 5 tasks `[x]`? If not, where did it stop, and why?
- `STATUS.md` state = `BAKEOFF_COMPLETE`?

### 2. Spec adherence (1–5)

- Pre-flight checks ran (look for the boot-check section in commit history or STATUS.md history).
- `STATUS.md` regenerated on every fire (check git log on STATUS.md).
- `BLOCKERS.md` format correct (if any blockers occurred).
- No `git add -A` in any commit (check `git log -p`).
- Commit prefixes `T-NN:` present and consistent.
- Marker transitions clean: `[ ]` → `[~]` → `[x]` without leftover `[~]` anywhere.
- Tier self-report (`Running on:`) appears in STATUS.md.

### 3. Code quality (1–5)

- `package.json` dependencies match `BUILD_BRIEF.md §2` (or T-03's spec).
- `tsconfig.json` is strict (`strict: true`, `noUncheckedIndexedAccess`, etc.).
- `.eslintrc.cjs` matches `starter/.eslintrc.cjs` invariants.
- `tsc --noEmit` passes.
- `npm install && npm run build` works on the branch.
- `npm test` passes the sample test from T-05.

### 4. Hygiene (1–5)

- Zero force-push attempts (moot but should never appear in any history).
- Zero commits on `main` (verify with `git log main` shows it unchanged).
- Zero files modified outside the declared `Outputs:` of each task.
- Commit messages are descriptive and follow the protocol's format.

### 5. Speed & quota (informational)

- Wall-clock time across all 5 tasks (compare timestamps of first and last commit per branch).
- Rough token / message count if your app exposes it.

### Qualitative notes

- Did anything surprise you?
- Any drift from the spec that mattered?
- Would you trust this driver overnight on the remaining ~115 tasks?

---

## Comparison commands

Run these from `main` after all drivers finish.

```bash
# All bake-off branches at a glance
git branch --list 'bakeoff/*' -v

# Commit messages per branch (sorted, side-by-side conceptually)
for b in bakeoff/claude bakeoff/cursor bakeoff/gpt5; do
  echo "═══ $b ═══"
  git log --oneline "$b" ^main
  echo ""
done

# File-level diff of each branch vs main
for b in bakeoff/claude bakeoff/cursor bakeoff/gpt5; do
  echo "═══ $b vs main ═══"
  git diff main.."$b" --stat
  echo ""
done

# What model + effort each driver self-reported in STATUS.md
for b in bakeoff/claude bakeoff/cursor bakeoff/gpt5; do
  echo "═══ $b STATUS.md tier ═══"
  git show "$b:STATUS.md" 2>/dev/null | grep -E "Running on|Driver branch|tier-mismatch|State" || echo "  (no STATUS.md on $b)"
  echo ""
done

# Any blockers per branch?
for b in bakeoff/claude bakeoff/cursor bakeoff/gpt5; do
  echo "═══ $b BLOCKERS.md ═══"
  git show "$b:BLOCKERS.md" 2>/dev/null | head -40 || echo "  (no BLOCKERS.md on $b)"
  echo ""
done

# Sanity: does each branch's package.json install + build cleanly?
# Warning: this is slow (npm install runs 3× and is destructive of node_modules).
# Skip if you've already eyeballed the results.
for b in bakeoff/claude bakeoff/cursor bakeoff/gpt5; do
  echo "═══ $b build sanity ═══"
  git checkout "$b"
  rm -rf node_modules
  npm install --silent 2>&1 | tail -5
  npm run build 2>&1 | tail -5
done
git checkout main

# Examine commit hygiene — look for git add -A or unrelated files
for b in bakeoff/claude bakeoff/cursor bakeoff/gpt5; do
  echo "═══ $b commit hygiene (suspicious patterns) ═══"
  # Any commit touching > 20 files? Probably scope creep.
  git log --stat "$b" ^main | grep -E "^ [0-9]+ files? changed" | awk '{if ($1 > 20) print "  LARGE COMMIT:", $0}'
done
```

---

## Picking a winner and cleanup

Once you've decided which driver wins (let's say `bakeoff/claude`):

```bash
# All commands run from the main worktree
cd ~/Documents/jayson-docs
git checkout main

# 1. Remove the worktrees first (they hold a working copy that pins
#    each branch; you can't delete a branch while a worktree is on it)
git worktree remove ~/Documents/jayson-docs-claude
git worktree remove ~/Documents/jayson-docs-cursor
git worktree remove ~/Documents/jayson-docs-gpt5

# 2. Merge or cherry-pick the winning branch onto main, then push
# Option A — Cherry-pick the winner's commits onto main (preserves linear history)
git cherry-pick bakeoff-start..bakeoff/claude
git push origin main

# Option B — Reset main to the winning branch (CAUTION: rewrites history;
# only safe if no one else has pulled origin/main since bakeoff-start)
# git reset --hard bakeoff/claude
# git push --force-with-lease origin main

# 3. Delete the losing branches and the (now-merged) winner branch
git branch -D bakeoff/cursor bakeoff/gpt5
git branch -D bakeoff/claude

# 4. Delete the recovery tag
git tag -d bakeoff-start

# 5. Decide whether to keep the bake-off artifacts (for future bake-offs)
# or remove them now:
#
# git rm .claude/commands/next-task-bakeoff.md scripts/bakeoff-setup.sh BAKEOFF.md
# git commit -m "Remove bake-off artifacts; <winner> chosen as driver"
# git push origin main
```

**Important: worktrees first, branches second.** Git refuses to delete a branch that has a worktree on it. If you forget step 1, you'll get `error: Cannot delete branch 'bakeoff/claude' checked out at ~/Documents/jayson-docs-claude` — run `git worktree remove` and retry.

---

## Sanity check before launching all 3 drivers

To avoid burning 3× the quota on a misconfigured slash command, run **Driver 1** to its first commit only, then inspect:

```bash
git checkout bakeoff/claude
# In Claude Code (Sonnet 4.6 + high), invoke /next-task-bakeoff ONCE.
# Wait for it to finish T-01 and stop.

# Then verify:
git log --oneline bakeoff/claude ^main     # Should show 1 commit: T-01: ...
git log main                                # Should be unchanged (no contamination)
cat STATUS.md                               # Should have "Running on: Claude Sonnet 4.6 at high"
git show HEAD --stat                        # Should touch only files in T-01's Outputs:
```

If all four checks pass, launch Drivers 2 and 3. If any check fails, debug `.claude/commands/next-task-bakeoff.md` before committing more quota.

---

## What "good" looks like (anchor)

A clean bake-off run on Claude Sonnet 4.6 high should produce:

```
bakeoff/claude
├── T-01: claim                          (marker change)
├── T-01: initialize repo + vite app     (drops in starter/package.json, vite.config.ts, etc.)
├── T-02: claim
├── T-02: set up tauri 2.x desktop shell (drops in starter/src-tauri/)
├── T-03: claim
├── T-03: pin exact dependency versions
├── T-04: claim
├── T-04: set up eslint + prettier + editorconfig
├── T-05: claim
└── T-05: set up vitest with passing sample test
```

10 commits total (5 claims + 5 implementations). STATUS.md state = `BAKEOFF_COMPLETE`. No `BLOCKERS.md` entries. No regressions.

Drivers that produce fewer commits, more files per commit, or weird marker states are doing something the protocol disallows. That's the signal.
