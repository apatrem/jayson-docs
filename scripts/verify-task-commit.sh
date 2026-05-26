#!/usr/bin/env bash
# verify-task-commit.sh — pre-commit hook for the autonomous task loop.
#
# Enforced invariants:
#   1. Loop-managed files (docs/TASKS.md, STATUS.md, BLOCKERS.md) are staged
#      together when any of them is mutated. You cannot commit a TASKS.md
#      marker change without also staging the regenerated STATUS.md, etc.
#   2. No accidentally-staged paths from gitignored or generated locations
#      (node_modules/, target/, dist/, .env, .DS_Store, etc.).
#   3. STATUS.md is regenerated whenever docs/TASKS.md changes (sub-rule of #1).
#
# Scope: only fires on `main` and `bakeoff/*` branches. Feature branches and
# any other branch are skipped (exit 0 immediately) so contributors making
# manual commits aren't blocked by loop-protocol rules.
#
# Install: `bash scripts/install-hooks.sh` (symlinks into .git/hooks/pre-commit).
# Companion: `.claude/commands/next-task.md` §"Loop-managed files".

set -euo pipefail

# ── Branch gate ────────────────────────────────────────────────────────────

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

case "$BRANCH" in
  main|bakeoff/*) ;;  # enforce
  *) exit 0 ;;        # skip on feature/other branches
esac

# ── Output helpers ─────────────────────────────────────────────────────────

red()    { printf '\033[31m%s\033[0m\n' "$*" >&2; }
yellow() { printf '\033[33m%s\033[0m\n' "$*" >&2; }
green()  { printf '\033[32m%s\033[0m\n' "$*" >&2; }

fail() {
  red ""
  red "✗ pre-commit (verify-task-commit.sh): $*"
  red ""
  red "If the hook is genuinely wrong for this commit, mark the task [?] in"
  red "docs/TASKS.md with reason 'hook-misfire: <reason>' and halt cleanly."
  red "NEVER bypass with --no-verify — that violates the hard rules."
  red ""
  exit 1
}

# ── Helpers ────────────────────────────────────────────────────────────────

LOOP_FILES="docs/TASKS.md STATUS.md BLOCKERS.md"
REPO_ROOT=$(git rev-parse --show-toplevel)

is_staged() {
  git diff --cached --name-only -- "$1" 2>/dev/null | grep -Fxq "$1"
}

has_unstaged_changes() {
  # True if file differs between working tree and index AND exists.
  if [[ -e "$1" ]]; then
    ! git diff --quiet -- "$1"
  else
    return 1
  fi
}

# Returns "true" iff the staged docs/TASKS.md diff contains REAL marker
# transitions (the same task ID has a different marker on the - and + sides).
# Pure text edits (titles, Outputs:, Reads:) leave markers unchanged and
# return "false".
is_loop_commit() {
  if ! is_staged "docs/TASKS.md"; then
    echo "false"
    return
  fi
  local old_p new_p
  old_p=$(git diff --cached -- docs/TASKS.md \
    | grep -E '^-### T-[0-9]' \
    | sed -E 's/^-### (T-[0-9]+[a-z]?( \+ T-[0-9]+[a-z]?)*) \[([^]]+)\] ·.*/\1=\3/' \
    | sort -u)
  new_p=$(git diff --cached -- docs/TASKS.md \
    | grep -E '^\+### T-[0-9]' \
    | sed -E 's/^\+### (T-[0-9]+[a-z]?( \+ T-[0-9]+[a-z]?)*) \[([^]]+)\] ·.*/\1=\3/' \
    | sort -u)
  if [[ -n "$(comm -3 <(echo "$old_p") <(echo "$new_p") 2>/dev/null | grep -E .)" ]]; then
    echo "true"
  else
    echo "false"
  fi
}

# Compute once; reused by Assertion 1b and Assertion 4.
LOOP_COMMIT=$(is_loop_commit)

# Staged file list — used by several assertions.
staged_files=$(git diff --cached --name-only)

# ── Assertion 1: loop-managed files bundled together ──────────────────────

any_loop_file_staged=false
unstaged_loop_files=""

for f in $LOOP_FILES; do
  if is_staged "$f"; then
    any_loop_file_staged=true
  fi
  if has_unstaged_changes "$f"; then
    unstaged_loop_files+=" $f"
  fi
done

if [[ "$any_loop_file_staged" == "true" ]] && [[ -n "$unstaged_loop_files" ]]; then
  fail "Loop-managed files must be staged together when any of them is mutated.
   Currently staged: $(git diff --cached --name-only | grep -E '^(docs/TASKS\.md|STATUS\.md|BLOCKERS\.md)$' | tr '\n' ' ')
   Unstaged but modified:$unstaged_loop_files
   Fix: \`git add$unstaged_loop_files\` and retry the commit."
fi

# ── Assertion 1c: reject STATUS-only commits (Q3 strengthening) ───────────
# A commit that stages ONLY STATUS.md (and nothing else) is the failure mode
# we saw post-T-20: the loop forgot to bundle STATUS.md with the task commit,
# then patched it as a separate "chore: regenerate STATUS.md" follow-up.
# That violates Q3 (bundle STATUS.md into the task commit) but slips past
# Assertion 1b because no TASKS.md transition is present in the diff.
#
# Rule: STATUS.md cannot be the sole content of a commit on a loop branch.
# If you're regenerating STATUS.md after the fact, either amend the previous
# task commit (only safe if it's not pushed yet) or pair the STATUS.md update
# with the next task's commit naturally.

all_staged="$staged_files"  # reuse the global computed earlier
staged_count=$(printf '%s\n' "$all_staged" | grep -c .)

if [[ "$staged_count" == "1" ]] && [[ "$all_staged" == "STATUS.md" ]]; then
  fail "STATUS-only commit detected (only STATUS.md is staged).
   Per Q3, STATUS.md must be bundled with the task commit, not committed alone.
   If you're catching up a missed regeneration:
     - If the prior task commit hasn't been pushed: \`git commit --amend\` it instead.
     - If it has been pushed: stage STATUS.md with the next task's commit naturally.
     - For genuine standalone regeneration (e.g., manual /status invocation that
       writes the file), reset the working tree and don't commit it."
fi

# ── Assertion 1b: loop commits must include STATUS.md regeneration ───────

# Detect "is this a loop commit?" by looking for REAL marker transitions in
# the staged TASKS.md diff. A real transition means the SAME task ID has a
# different marker on the `-` and `+` lines. Pure text edits (e.g. renaming
# "Move" → "Copy" in a task title) leave the marker unchanged and must NOT
# trip this check — that's a structural edit, not a loop commit.
#
# Method: extract `T-NN=marker` pairs from `-` and `+` lines separately,
# then use comm to find pairs that exist on one side only (i.e., the marker
# value changed for some task). Compound headers like `T-76 + T-77` are
# treated as one task ID for this purpose.

if [[ "$LOOP_COMMIT" == "true" ]] && ! is_staged "STATUS.md"; then
  # Real loop transition. Require STATUS.md to be staged AND differ from HEAD.
  if git diff --quiet HEAD -- STATUS.md 2>/dev/null; then
    fail "Loop commit detected (TASKS.md has real marker transitions)
   but STATUS.md was not regenerated. Per Step 6, every task commit must
   include the regenerated STATUS.md. Run the regeneration,
   \`git add STATUS.md\`, and retry."
  fi
fi
# Pure title/Outputs/Reads edits leave the marker unchanged for every task
# and are exempt — those are structural spec edits, not loop commits.

# ── Assertion 5: Q2 enforcement — one [x] completion per commit ──────────
# The fe49d83 mega-commit (six tasks bundled — T-42, T-43, T-44, T-45, T-46,
# T-46b) revealed that the existing assertions catch staging discipline but
# not the "one commit per task" rule from Q2. The driver collapsed six
# separable diffs into one, defeating per-task git bisect / cherry-pick /
# review.
#
# Rule: at most one marker transition to [x] per commit. Cold-recovery
# resets ([~]→[ ]) and failure markings ([ ]/[~]→[?] or [!]) are exempt
# because the protocol explicitly produces ONE such transition per fire.
# Skip cascades are exempt too but rare (none have happened in practice).

if [[ "$LOOP_COMMIT" == "true" ]]; then
  # Lines unique to new_pairs = the new state of changed tasks. Count those
  # ending in `=x` — those are completions.
  # NOTE: `grep || true` on each line is required because `grep -E` exits 1
  # when there are no matches, and `set -euo pipefail` at the top of this
  # script would then kill the hook silently on commits that ADD new task
  # entries without modifying any existing markers (no `-### T-` lines at
  # all in the diff). Without `|| true`, plan-execution commits that queue
  # new pending tasks die at this assignment with no error message.
  old_pairs_a5=$(git diff --cached -- docs/TASKS.md \
    | { grep -E '^-### T-[0-9]' || true; } \
    | sed -E 's/^-### (T-[0-9]+[a-z]?( \+ T-[0-9]+[a-z]?)*) \[([^]]+)\] ·.*/\1=\3/' \
    | sort -u)
  new_pairs_a5=$(git diff --cached -- docs/TASKS.md \
    | { grep -E '^\+### T-[0-9]' || true; } \
    | sed -E 's/^\+### (T-[0-9]+[a-z]?( \+ T-[0-9]+[a-z]?)*) \[([^]]+)\] ·.*/\1=\3/' \
    | sort -u)

  completions=$(comm -13 <(echo "$old_pairs_a5") <(echo "$new_pairs_a5") 2>/dev/null \
    | grep -cE '=x$' || true)

  if [[ "$completions" -gt 1 ]]; then
    completed_ids=$(comm -13 <(echo "$old_pairs_a5") <(echo "$new_pairs_a5") 2>/dev/null \
      | grep -E '=x$' | sed -E 's/=.*//' | tr '\n' ' ')
    fail "Multi-task commit detected: $completions tasks transitioned to [x]
   in this commit ($completed_ids).
   Per Q2, one commit per task. If the tasks are too tightly coupled to
   separate (e.g., a pipeline whose stages can't be staged independently),
   propose a spec carve-out first — don't bundle silently."
  fi
fi

# ── Assertion 2: forbidden paths in the staged set ────────────────────────

FORBIDDEN_REGEX='(^|/)(node_modules|target|dist|build|\.next|\.turbo|\.cache|coverage)/|\.DS_Store$|\.env(\..+)?$|/\.idea/|/\.vscode/settings\.json$'

forbidden_matches=$(echo "$staged_files" | grep -E "$FORBIDDEN_REGEX" || true)

if [[ -n "$forbidden_matches" ]]; then
  fail "Forbidden paths in staged set:
$(echo "$forbidden_matches" | sed 's/^/   • /')
   These belong in .gitignore, not in a commit.
   Fix: \`git rm --cached <file>\` for each, add to .gitignore, retry."
fi

# ── Assertion 3: no large binary blobs (defensive) ────────────────────────

# Reject files > 5MB staged unless they're explicitly on the allow-list
# (icons are typically < 1MB; lockfiles can be ~500KB max).
MAX_BYTES=$((5 * 1024 * 1024))

large_files=""
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  [[ ! -f "$f" ]] && continue
  size=$(wc -c < "$f" | tr -d ' ')
  if (( size > MAX_BYTES )); then
    large_files+="   • $f (${size} bytes)
"
  fi
done <<< "$staged_files"

if [[ -n "$large_files" ]]; then
  fail "Large file(s) staged (>5MB threshold — suspicious for spec/code repo):
$large_files   If a binary asset is genuinely needed, add to .gitattributes/LFS first."
fi

# ── Assertion 4: project-wide gates (the step-5 machine backstop) ─────────
# Runs scripts/verify-gates.sh (tsc + lint + tests) when the commit either
# (a) is a loop transition (which means the loop just shipped code), or
# (b) stages any TypeScript / JavaScript / Rust source file (manual edits).
# Pure docs / markdown / script-only commits skip this — they can't break
# the build, so spending 5 seconds on tsc would be noise.
#
# Why this exists: T-24 shipped with broken tsc + lint because Cursor Auto
# silently skipped step 5 (driver discipline). The hook now invokes the
# same gate runner so a commit that breaks the project simply cannot land,
# regardless of which driver wrote it. See ADR-0003 (forthcoming).

needs_gates=false

if [[ "$LOOP_COMMIT" == "true" ]]; then
  needs_gates=true
fi

if echo "$staged_files" | grep -qE '\.(ts|tsx|js|jsx|cjs|mjs|rs)$'; then
  needs_gates=true
fi

if [[ "$needs_gates" == "true" ]]; then
  yellow ""
  yellow "  Running project-wide gates (verify-gates.sh) — may take ~5s..."
  if ! bash "$REPO_ROOT/scripts/verify-gates.sh"; then
    fail "Project-wide gates failed. The commit would land a regression.
   See the gate output above. Fix the failures and retry.
   To inspect interactively: \`bash scripts/verify-gates.sh\` (run by itself
   outside the hook for unmuted output, or set GATES_VERBOSE=1)."
  fi
fi

# ── OK ─────────────────────────────────────────────────────────────────────

green "✓ pre-commit (verify-task-commit.sh): loop invariants OK"
exit 0
