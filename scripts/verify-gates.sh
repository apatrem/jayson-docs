#!/usr/bin/env bash
# verify-gates.sh — single source of truth for the loop's project-wide gates.
#
# Runs (in order):
#   1. tsc --noEmit        (project-wide typecheck)
#   2. npm run lint        (architectural invariants)
#   3. npm test            (full suite)
#
# Exit 0 iff every applicable gate passes. Pre-M0 escape: if package.json or
# node_modules is absent, skips with a warning rather than failing — the
# loop's first few tasks (T-01..T-05) create these and can't run gates that
# haven't been bootstrapped.
#
# Invoked from two places:
#   - next-task.md step 5 (GLOBAL QUALITY GATES) — driver discipline path
#   - scripts/verify-task-commit.sh Assertion 4 — pre-commit machine backstop
#
# Both call this script so the gate definition lives in one place. If the
# project later adds a new gate (e.g. cargo check for Rust, a custom
# architectural lint), extend this script and both callers benefit.
#
# Env flags:
#   SKIP_TESTS=1     skip `npm test` (use only when you've already run it;
#                    hook respects this for speed on commits with no test
#                    changes — but the loop itself never sets this)
#   GATES_VERBOSE=1  show full output of each gate; default is summary only

set -uo pipefail   # NOT -e: we want to run all gates even if earlier ones fail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_ROOT"

# ── Output ────────────────────────────────────────────────────────────────

red()    { printf '\033[31m%s\033[0m\n' "$*" >&2; }
green()  { printf '\033[32m%s\033[0m\n' "$*" >&2; }
yellow() { printf '\033[33m%s\033[0m\n' "$*" >&2; }
bold()   { printf '\033[1m%s\033[0m\n' "$*" >&2; }

fail_count=0
pass_count=0
skip_count=0

run_gate() {
  local label="$1"
  local cmd="$2"
  local start_ts end_ts elapsed

  printf "  %-30s " "$label" >&2
  start_ts=$(date +%s)

  if [[ "${GATES_VERBOSE:-0}" == "1" ]]; then
    echo "" >&2
    eval "$cmd" >&2
    local rc=$?
  else
    local output
    output=$(eval "$cmd" 2>&1)
    local rc=$?
  fi

  end_ts=$(date +%s)
  elapsed=$((end_ts - start_ts))

  if [[ "$rc" -eq 0 ]]; then
    green "✓ pass (${elapsed}s)"
    pass_count=$((pass_count + 1))
  else
    red "✗ FAIL (${elapsed}s)"
    fail_count=$((fail_count + 1))
    if [[ "${GATES_VERBOSE:-0}" != "1" ]]; then
      # Show the failing output so the human/driver can see what broke
      echo "    --- first 30 lines of output ---" >&2
      echo "$output" | head -30 | sed 's/^/    /' >&2
      echo "    --- (re-run with GATES_VERBOSE=1 for full output) ---" >&2
    fi
  fi
}

skip_gate() {
  local label="$1"
  local reason="$2"
  printf "  %-30s " "$label" >&2
  yellow "⊘ skip — $reason"
  skip_count=$((skip_count + 1))
}

# ── Pre-flight: is the project bootstrapped enough to run gates? ──────────

if [[ ! -f "package.json" ]]; then
  yellow "  verify-gates.sh: no package.json at $REPO_ROOT — pre-M0 escape, skipping all gates."
  exit 0
fi

if [[ ! -d "node_modules" ]]; then
  yellow "  verify-gates.sh: no node_modules/ — run \`npm install\` first. Skipping gates rather than failing (pre-M0 escape)."
  exit 0
fi

bold ""
bold "═══ Project-wide gates (scripts/verify-gates.sh) ═══"

# ── Gate 1: tsc --noEmit ──────────────────────────────────────────────────

if [[ -f "tsconfig.json" ]]; then
  run_gate "tsc --noEmit" "npx tsc --noEmit"
else
  skip_gate "tsc --noEmit" "no tsconfig.json"
fi

# ── Gate 2: npm run lint ──────────────────────────────────────────────────

if grep -q '"lint"' package.json 2>/dev/null; then
  run_gate "npm run lint" "npm run --silent lint"
else
  skip_gate "npm run lint" "no 'lint' script in package.json"
fi

# ── Gate 3: npm test ──────────────────────────────────────────────────────

if [[ "${SKIP_TESTS:-0}" == "1" ]]; then
  skip_gate "npm test" "SKIP_TESTS=1"
elif grep -q '"test"' package.json 2>/dev/null; then
  # Use --silent + --run to keep vitest from going interactive
  run_gate "npm test" "npm test --silent -- --run"
else
  skip_gate "npm test" "no 'test' script in package.json"
fi

# ── Summary ───────────────────────────────────────────────────────────────

bold ""
printf "  Gates: %d pass, %d fail, %d skip\n" "$pass_count" "$fail_count" "$skip_count" >&2

if [[ "$fail_count" -gt 0 ]]; then
  red ""
  red "✗ Project-wide gates failed. Fix the failures above before committing."
  red ""
  exit 1
fi

green "✓ All applicable gates pass."
exit 0
