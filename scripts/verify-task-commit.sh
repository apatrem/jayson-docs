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

all_staged=$(git diff --cached --name-only)
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

# Detect "is this a loop commit?" by looking for marker transitions in the
# staged TASKS.md diff. Loop transitions involve markers other than the
# initial [ ]: [~] / [x] / [?] / [!] / [skip]. A structural edit that only
# changes [ ] (e.g., adding new tasks, splitting Inputs into Depends-on) is
# not a loop commit and does not require STATUS.md regeneration.
#
# Pattern matches lines added/removed of the form: `### T-NN [marker] ·`
# where marker is one of the "in flight" or "terminal" markers, not [ ].

if is_staged "docs/TASKS.md" && ! is_staged "STATUS.md"; then
  has_transition=$(git diff --cached -- docs/TASKS.md \
    | grep -cE '^[+-]### T-[0-9]+[a-z]? \[(~|x|\?|!|skip)\] ·' || true)

  if [[ "$has_transition" -gt 0 ]]; then
    # Loop commit detected. Require STATUS.md to be staged AND differ from HEAD.
    if git diff --quiet HEAD -- STATUS.md 2>/dev/null; then
      fail "Loop commit detected (TASKS.md has a marker transition) but STATUS.md
   was not regenerated. Per the loop's Step 6, every task commit must include
   the regenerated STATUS.md. Run the regeneration, \`git add STATUS.md\`,
   and retry."
    fi
  fi
  # Structural edits (only [ ] markers, or non-marker changes) are exempt.
fi

# ── Assertion 2: forbidden paths in the staged set ────────────────────────

FORBIDDEN_REGEX='(^|/)(node_modules|target|dist|build|\.next|\.turbo|\.cache|coverage)/|\.DS_Store$|\.env(\..+)?$|/\.idea/|/\.vscode/settings\.json$'

staged_files=$(git diff --cached --name-only)

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

# ── OK ─────────────────────────────────────────────────────────────────────

green "✓ pre-commit (verify-task-commit.sh): loop invariants OK"
exit 0
