#!/usr/bin/env bash
# verify-bakeoff-v2.sh — binary checklist validating a bakeoff/*-v2 branch
# against the 12 spec fixes captured during the v1 → v2 bake-off methodology
# (10 original + 2 scaffold-hardening assertions added by T-114 for the
# `protocol-asset` Tauri feature pin + Cargo.lock parity in main + starter).
#
# Usage:
#   bash scripts/verify-bakeoff-v2.sh [branch]
#   bash scripts/verify-bakeoff-v2.sh bakeoff/claude-v2
#   bash scripts/verify-bakeoff-v2.sh --all      # check all bakeoff/*-v2 branches
#
# Exit 0 = all assertions pass. Exit non-zero = at least one failed; count
# in the final summary line.
#
# Each assertion is a function whose name starts with `check_`. The driver
# loop iterates them; output is one PASS/FAIL line per check.

set -uo pipefail   # NOT -e: we want to run all checks even if some fail.

TAG_PREFIX="bakeoff-start-v2"

# ── Output ────────────────────────────────────────────────────────────────

red()    { printf '\033[31m✗\033[0m %s\n' "$*"; }
green()  { printf '\033[32m✓\033[0m %s\n' "$*"; }
yellow() { printf '\033[33m!\033[0m %s\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n' "$*"; }

fail_count=0
pass_count=0
warn_count=0

assert() {
  local label="$1" status="$2" detail="${3:-}"
  if [[ "$status" == "pass" ]]; then
    green "$label"
    pass_count=$((pass_count + 1))
  elif [[ "$status" == "warn" ]]; then
    yellow "$label${detail:+ — $detail}"
    warn_count=$((warn_count + 1))
  else
    red "$label${detail:+ — $detail}"
    fail_count=$((fail_count + 1))
  fi
}

# ── Branch resolution ─────────────────────────────────────────────────────

resolve_branches() {
  local arg="${1:-}"
  if [[ "$arg" == "--all" ]] || [[ -z "$arg" ]]; then
    git branch --list 'bakeoff/*-v2' --format='%(refname:short)'
  else
    echo "$arg"
  fi
}

# ── Checks (parameterized by $BRANCH) ─────────────────────────────────────

# Resolve the start tag for this branch's version.
resolve_start_tag() {
  local branch="$1"
  # bakeoff/claude-v2 → bakeoff-start-v2
  # bakeoff/cursor → bakeoff-start
  if [[ "$branch" =~ -v([0-9]+)$ ]]; then
    echo "bakeoff-start-v${BASH_REMATCH[1]}"
  else
    echo "bakeoff-start"
  fi
}

check_1_marker_suffix() {
  # All task headers in TASKS.md on this branch use suffix marker format.
  # Accepted patterns:
  #   ### T-NN [marker] · Title
  #   ### T-NN + T-MM [marker] · Title       (compound entries — multiple IDs sharing one body)
  #   ### T-NN + T-MM + T-OO [marker] · Title (3+ IDs also accepted)
  local bad
  bad=$(git show "$BRANCH:docs/TASKS.md" 2>/dev/null \
        | grep -E '^### T-[0-9]+[a-z]?' \
        | grep -vE '^### T-[0-9]+[a-z]?( \+ T-[0-9]+[a-z]?)* \[(  ?|~|x|\?|!|skip)\] ·' \
        | head -3 || true)
  if [[ -z "$bad" ]]; then
    assert "1. All task headers use suffix marker format ([marker] between ID and ·)" pass
  else
    assert "1. All task headers use suffix marker format" fail "first offender(s): $(echo "$bad" | head -1)"
  fi
}

check_2_five_task_commits() {
  # All of T-01..T-05 should have marker [x] in TASKS.md on the branch.
  # Failure-path commits (T-NN: block — ..., T-NN: wait — ...) are legitimate
  # protocol behavior and do not invalidate the assertion — we count
  # completed markers, not total commits.
  local completed=0 incomplete=""
  local tasks_md
  tasks_md=$(git show "$BRANCH:docs/TASKS.md" 2>/dev/null)

  for n in 01 02 03 04 05; do
    # Pull the marker from the line `### T-${n} [marker] · Title`.
    # Uses [^]]+ for portability — macOS BSD sed doesn't support {n,m}? non-greedy.
    local marker
    marker=$(echo "$tasks_md" \
             | grep -E "^### T-${n}( \+ T-[0-9]+[a-z]?)* \[" \
             | head -1 \
             | sed -E 's/^### T-[0-9]+[a-z]?( \+ T-[0-9]+[a-z]?)* \[([^]]+)\] ·.*/\2/')

    if [[ "$marker" == "x" ]]; then
      completed=$((completed + 1))
    else
      incomplete+="T-${n}=[${marker:-?}] "
    fi
  done

  if [[ "$completed" -eq 5 ]]; then
    assert "2. All T-01..T-05 completed ($completed/5 [x])" pass
  else
    assert "2. All T-01..T-05 completed" fail "$completed/5 [x]; incomplete: ${incomplete% }"
  fi
}

check_3_no_claim_commits() {
  # No commit subject ends with ": claim" (the old protocol pattern).
  local n
  n=$(git log --format='%s' "$START_TAG..$BRANCH" 2>/dev/null \
      | grep -cE ': claim$' || true)
  if [[ "$n" -eq 0 ]]; then
    assert "3. No claim commits (separate T-NN: claim entries)" pass
  else
    assert "3. No claim commits" fail "found $n"
  fi
}

check_4_status_in_every_commit() {
  # Every T-NN commit on the branch stages STATUS.md.
  local missing
  missing=$(git log --format='%H' "$START_TAG..$BRANCH" 2>/dev/null | while read -r sha; do
    if ! git show "$sha" --name-only --format= 2>/dev/null | grep -Fxq "STATUS.md"; then
      git log -1 --format='%h %s' "$sha"
    fi
  done)
  if [[ -z "$missing" ]]; then
    assert "4. STATUS.md staged in every task commit" pass
  else
    assert "4. STATUS.md staged in every task commit" fail "missing in: $(echo "$missing" | tr '\n' ',' | sed 's/,$//')"
  fi
}

check_5_running_on_present() {
  # STATUS.md on the branch has the "Running on:" and "Driver branch:" lines.
  local content
  content=$(git show "$BRANCH:STATUS.md" 2>/dev/null || echo "")
  local has_running
  has_running=$(echo "$content" | grep -cE '^[\*]*Running on:' || true)
  local has_driver
  has_driver=$(echo "$content" | grep -cE '^[\*]*Driver branch:' || true)
  if [[ "$has_running" -gt 0 ]] && [[ "$has_driver" -gt 0 ]]; then
    assert "5. STATUS.md self-reports tier (Running on:) and driver branch" pass
  else
    local missing=""
    [[ "$has_running" -eq 0 ]] && missing+="Running on:, "
    [[ "$has_driver" -eq 0 ]] && missing+="Driver branch:, "
    assert "5. STATUS.md self-reports tier and driver" fail "missing: ${missing%, }"
  fi
}

check_6_lockfiles_committed() {
  # package-lock.json and src-tauri/Cargo.lock should exist on the branch.
  local missing=""
  for f in package-lock.json src-tauri/Cargo.lock; do
    if ! git show "$BRANCH:$f" >/dev/null 2>&1; then
      missing+="$f "
    fi
  done
  if [[ -z "$missing" ]]; then
    assert "6. Reproducibility lockfiles committed (package-lock.json, Cargo.lock)" pass
  else
    assert "6. Reproducibility lockfiles committed" fail "missing: $missing"
  fi
}

check_7_tauri_icons_committed() {
  # At least one icon file in src-tauri/icons/ AND starter/src-tauri/icons/.
  # T-02's `Reads:` points at starter/src-tauri/{...}, so the drop-in source
  # must be self-contained — otherwise `cargo build` in starter/ panics at
  # `tauri::generate_context!()` because `./icons/icon.png` is missing.
  local n_main n_starter
  n_main=$(git ls-tree -r "$BRANCH" -- src-tauri/icons 2>/dev/null | wc -l | tr -d ' ')
  n_starter=$(git ls-tree -r "$BRANCH" -- starter/src-tauri/icons 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$n_main" -gt 0 ]] && [[ "$n_starter" -gt 0 ]]; then
    assert "7. Tauri icons committed (main: $n_main, starter: $n_starter)" pass
  else
    local missing=""
    [[ "$n_main" -eq 0 ]] && missing+="src-tauri/icons/ "
    [[ "$n_starter" -eq 0 ]] && missing+="starter/src-tauri/icons/ "
    assert "7. Tauri icons committed" fail "0 files in: ${missing% }"
  fi
}

check_8_no_inputs_field() {
  # No remaining "- **Inputs:**" lines in TASKS.md (all split to Depends-on/Reads).
  local n
  n=$(git show "$BRANCH:docs/TASKS.md" 2>/dev/null \
      | grep -cE '^- \*\*Inputs:\*\*' || true)
  if [[ "$n" -eq 0 ]]; then
    assert "8. No legacy 'Inputs:' field remains in TASKS.md" pass
  else
    assert "8. No legacy 'Inputs:' field" fail "found $n"
  fi
}

check_9_loop_managed_bundling() {
  # Any commit that touches docs/TASKS.md must also touch STATUS.md.
  local violations
  violations=$(git log --format='%H' "$START_TAG..$BRANCH" 2>/dev/null | while read -r sha; do
    local files
    files=$(git show "$sha" --name-only --format= 2>/dev/null)
    if echo "$files" | grep -Fxq "docs/TASKS.md" && ! echo "$files" | grep -Fxq "STATUS.md"; then
      git log -1 --format='%h %s' "$sha"
    fi
  done)
  if [[ -z "$violations" ]]; then
    assert "9. Loop-managed files bundled (TASKS.md commits include STATUS.md)" pass
  else
    assert "9. Loop-managed bundling" fail "$(echo "$violations" | head -1)"
  fi
}

check_10_no_forbidden_paths() {
  # No commit staged files in forbidden paths (node_modules, dist, etc.).
  local bad
  bad=$(git log --format='%H' "$START_TAG..$BRANCH" 2>/dev/null | while read -r sha; do
    git show "$sha" --name-only --format= 2>/dev/null \
      | grep -E '(^|/)(node_modules|target|dist|build|\.next|coverage)/' || true
  done | sort -u | head -3)
  if [[ -z "$bad" ]]; then
    assert "10. No forbidden paths in any commit" pass
  else
    assert "10. No forbidden paths" fail "$(echo "$bad" | head -1)"
  fi
}

check_11_protocol_asset_feature_pinned() {
  # Each src-tauri/Cargo.toml (main + starter) MUST declare the `protocol-asset`
  # feature in its tauri dep line. T-113 (post-e893e64) closed this drift:
  # the assetProtocol block in tauri.conf.json requires the protocol-asset
  # feature at compile time, and cargo would otherwise auto-mutate the
  # committed Cargo.toml on first build. The regex tolerates any
  # combination of features as long as `protocol-asset` is one of them.
  local missing=""
  for f in src-tauri/Cargo.toml starter/src-tauri/Cargo.toml; do
    local content
    content=$(git show "$BRANCH:$f" 2>/dev/null || true)
    if [[ -z "$content" ]]; then
      missing+="$f (file missing) "
      continue
    fi
    # Match `tauri = { ..., features = [..., "protocol-asset", ...] }` —
    # case-sensitive, tolerant of feature ordering + whitespace.
    if ! echo "$content" \
        | grep -E '^tauri[[:space:]]*=[[:space:]]*\{[^}]*features[[:space:]]*=[[:space:]]*\[[^]]*"protocol-asset"' \
        >/dev/null; then
      missing+="$f (no 'protocol-asset' feature in tauri dep) "
    fi
  done
  if [[ -z "$missing" ]]; then
    assert "11. protocol-asset Tauri feature pinned (main + starter Cargo.toml)" pass
  else
    assert "11. protocol-asset feature pinned" fail "missing in: ${missing% }"
  fi
}

check_12_cargo_lockfile_parity() {
  # Each src-tauri/ directory (main + starter, per the post-T-113 policy in
  # T-02 Outputs) MUST have a committed Cargo.lock AND `cargo check --locked`
  # MUST succeed from it. This catches the failure mode where Cargo.toml
  # drift would force a lockfile rewrite — symptom: a fresh clone runs
  # `cargo check --locked` and gets "the lockfile needs to be updated."
  #
  # We check existence here (via git show); the actual `cargo check --locked`
  # invocation lives in CI (.github/workflows/ci.yml) since running cargo
  # against checked-out trees is too slow for this fast-feedback verifier.
  local missing=""
  for f in src-tauri/Cargo.lock starter/src-tauri/Cargo.lock; do
    if ! git show "$BRANCH:$f" >/dev/null 2>&1; then
      missing+="$f "
    fi
  done
  if [[ -z "$missing" ]]; then
    assert "12. Cargo.lock parity (main + starter committed)" pass
  else
    assert "12. Cargo.lock parity" fail "missing committed lockfile: ${missing% }"
  fi
}

# ── Driver ────────────────────────────────────────────────────────────────

main() {
  local branches
  branches=$(resolve_branches "${1:-}")

  if [[ -z "$branches" ]]; then
    echo "No bakeoff/*-v2 branches found. Try: git branch --list 'bakeoff/*-v2'" >&2
    exit 2
  fi

  local total_branches=0
  local clean_branches=0

  for BRANCH in $branches; do
    total_branches=$((total_branches + 1))
    START_TAG=$(resolve_start_tag "$BRANCH")
    export BRANCH START_TAG

    bold ""
    bold "═══ $BRANCH (start tag: $START_TAG) ═══"

    if ! git rev-parse --verify --quiet "$START_TAG" >/dev/null; then
      red "  Start tag '$START_TAG' not found — skipping branch."
      fail_count=$((fail_count + 1))
      continue
    fi

    if ! git rev-parse --verify --quiet "$BRANCH" >/dev/null; then
      red "  Branch '$BRANCH' not found — skipping."
      fail_count=$((fail_count + 1))
      continue
    fi

    local before_fails=$fail_count

    check_1_marker_suffix
    check_2_five_task_commits
    check_3_no_claim_commits
    check_4_status_in_every_commit
    check_5_running_on_present
    check_6_lockfiles_committed
    check_7_tauri_icons_committed
    check_8_no_inputs_field
    check_9_loop_managed_bundling
    check_10_no_forbidden_paths
    check_11_protocol_asset_feature_pinned
    check_12_cargo_lockfile_parity

    if [[ "$fail_count" -eq "$before_fails" ]]; then
      clean_branches=$((clean_branches + 1))
    fi
  done

  bold ""
  bold "═══ Summary ═══"
  printf "Branches checked: %d  (clean: %d, with failures: %d)\n" \
    "$total_branches" "$clean_branches" "$((total_branches - clean_branches))"
  printf "Assertions:       %d pass, %d fail, %d warn\n" \
    "$pass_count" "$fail_count" "$warn_count"

  if [[ "$fail_count" -eq 0 ]]; then
    green ""
    green "All v2 spec-fix assertions pass. Spec improvements validated."
    exit 0
  else
    red ""
    red "v2 validation failed. Review per-branch FAIL lines above."
    exit 1
  fi
}

main "${1:-}"
