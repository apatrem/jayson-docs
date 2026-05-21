#!/usr/bin/env bash
# bakeoff-setup.sh — create the three local-only bake-off branches and
# (by default) the three git worktrees so the human can run all three
# drivers in parallel.
#
# Run once before launching any driver. Idempotent: existing branches /
# tag / worktrees are verified and preserved.
#
# Usage:
#   bash scripts/bakeoff-setup.sh                 # branches + tag + worktrees (default: v2)
#   bash scripts/bakeoff-setup.sh --version v3    # next-generation bake-off
#   bash scripts/bakeoff-setup.sh --version none  # original v1 names (no suffix)
#   bash scripts/bakeoff-setup.sh --no-worktrees  # branches + tag only (sequential workflow)
#
# Versioning (per BAKEOFF.md Q9 decision):
#   v1 (legacy, frozen):  branches bakeoff/claude     + tag bakeoff-start
#   v2 (current):         branches bakeoff/claude-v2  + tag bakeoff-start-v2
#   v3, v4, ...:          branches bakeoff/claude-vN  + tag bakeoff-start-vN
#
# Default version is v2 going forward. Pass --version none to recreate the
# v1 layout (rarely needed since v1 should already exist on disk as the
# frozen comparison baseline).
#
# Companion to BAKEOFF.md and .claude/commands/next-task-bakeoff.md.

set -euo pipefail

# ── Parse flags ─────────────────────────────────────────────────────────────

CREATE_WORKTREES=true
VERSION="v2"   # default per Q9: v2 is the canonical current bake-off

# Parse flags before computing derived values (BRANCHES, TAG depend on VERSION).
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-worktrees)
      CREATE_WORKTREES=false
      shift
      ;;
    --version)
      VERSION="${2:-}"
      if [[ -z "$VERSION" ]]; then
        echo "ERROR: --version requires an argument (e.g., v2, v3, none)" >&2
        exit 2
      fi
      shift 2
      ;;
    --version=*)
      VERSION="${1#--version=}"
      shift
      ;;
    --help|-h)
      head -22 "$0" | grep -E "^#"
      exit 0
      ;;
    *)
      echo "Unknown flag: $1" >&2
      echo "Try: --no-worktrees, --version v2, --help" >&2
      exit 2
      ;;
  esac
done

# Normalize the version → suffix (none → empty; everything else → "-vN")
case "$VERSION" in
  none|"")
    SUFFIX=""
    TAG="bakeoff-start"
    ;;
  v[0-9]*)
    SUFFIX="-${VERSION}"
    TAG="bakeoff-start-${VERSION}"
    ;;
  *)
    echo "ERROR: --version must be 'none' or 'vN' (e.g., v2, v3)." >&2
    exit 2
    ;;
esac

BRANCHES=(
  "bakeoff/claude${SUFFIX}"
  "bakeoff/cursor${SUFFIX}"
  "bakeoff/gpt5${SUFFIX}"
)

# Worktree paths are siblings of the main repo by default.
# Override by setting WORKTREE_BASE before invoking.
REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_ROOT")
PARENT_DIR=$(dirname "$REPO_ROOT")
WORKTREE_BASE="${WORKTREE_BASE:-$PARENT_DIR}"

# Compute the worktree path for a given branch on the fly.
# Avoids `declare -A` so the script works on macOS's default bash 3.2.
worktree_path_for() {
  local branch="$1"
  local driver_tail="${branch#bakeoff/}"   # "claude-v2", "cursor", etc.
  echo "$WORKTREE_BASE/${REPO_NAME}-${driver_tail}"
}

echo "Bake-off setup: version='${VERSION}' (tag='${TAG}', branch suffix='${SUFFIX:-<none>}')."

# ── Verify state ───────────────────────────────────────────────────────────

current_branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$current_branch" != "main" ]]; then
  echo "ERROR: must run on main (currently on '$current_branch')." >&2
  echo "Switch with: git checkout main" >&2
  exit 1
fi

if [[ -n $(git status --porcelain) ]]; then
  echo "ERROR: working tree not clean. Commit or stash before running." >&2
  git status --short >&2
  exit 1
fi

# Optional: ensure main matches origin/main (skip if no remote tracking)
if git rev-parse --verify --quiet origin/main >/dev/null; then
  if ! git diff --quiet HEAD origin/main 2>/dev/null; then
    echo "WARNING: HEAD differs from origin/main. Consider 'git pull' first." >&2
  fi
fi

# ── Create the bakeoff-start tag (idempotent) ──────────────────────────────

if git rev-parse --verify --quiet "$TAG" >/dev/null; then
  existing_sha=$(git rev-parse "$TAG")
  head_sha=$(git rev-parse HEAD)
  if [[ "$existing_sha" != "$head_sha" ]]; then
    echo "ERROR: tag '$TAG' exists but points at $existing_sha, not current HEAD ($head_sha)." >&2
    echo "Either delete the tag (git tag -d $TAG) or check out the right commit before re-running." >&2
    exit 1
  fi
  echo "Tag '$TAG' already exists at HEAD — keeping."
else
  git tag "$TAG"
  echo "Tagged current HEAD as '$TAG' (used by next-task-bakeoff for crash recovery)."
fi

# ── Create branches (idempotent) ───────────────────────────────────────────

for branch in "${BRANCHES[@]}"; do
  if git rev-parse --verify --quiet "$branch" >/dev/null; then
    echo "Branch '$branch' already exists — keeping."
  else
    git branch "$branch"
    echo "Created branch '$branch' off HEAD."
  fi
done

# Ensure we're still on main in the primary worktree
git checkout main >/dev/null 2>&1

# ── Create worktrees (idempotent, parallel workflow) ───────────────────────

if [[ "$CREATE_WORKTREES" == "true" ]]; then
  for branch in "${BRANCHES[@]}"; do
    wt_path=$(worktree_path_for "$branch")

    if git worktree list --porcelain | grep -q "^worktree $wt_path$"; then
      # Already a worktree — verify it's on the right branch
      existing_branch=$(git -C "$wt_path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
      if [[ "$existing_branch" != "$branch" ]]; then
        echo "ERROR: worktree at $wt_path is on '$existing_branch', expected '$branch'." >&2
        echo "Remove it with: git worktree remove $wt_path" >&2
        exit 1
      fi
      echo "Worktree '$wt_path' already exists on '$branch' — keeping."
    elif [[ -e "$wt_path" ]]; then
      echo "ERROR: '$wt_path' exists but is not a git worktree." >&2
      echo "Remove the directory or pick a different WORKTREE_BASE." >&2
      exit 1
    else
      git worktree add "$wt_path" "$branch"
      echo "Created worktree at '$wt_path' on '$branch'."
    fi
  done
fi

# ── Report ─────────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo " Bake-off ready. Branches (local-only, NOT pushed):"
echo "═══════════════════════════════════════════════════════════════════"
git branch --list 'bakeoff/*' -v
echo ""
echo " Recovery tag:"
git tag --list "$TAG" | sed 's/^/   /'

if [[ "$CREATE_WORKTREES" == "true" ]]; then
  echo ""
  echo " Worktrees (each app opens its own — parallel workflow):"
  for branch in "${BRANCHES[@]}"; do
    echo "   $(worktree_path_for "$branch")  →  $branch"
  done
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo " Next steps — see BAKEOFF.md for full instructions per driver:"
echo "═══════════════════════════════════════════════════════════════════"

if [[ "$CREATE_WORKTREES" == "true" ]]; then
WT_CLAUDE=$(worktree_path_for "bakeoff/claude${SUFFIX}")
WT_CURSOR=$(worktree_path_for "bakeoff/cursor${SUFFIX}")
WT_GPT5=$(worktree_path_for "bakeoff/gpt5${SUFFIX}")
cat <<EOF

  PARALLEL workflow (recommended — all three apps run simultaneously):

  Driver 1 — Claude Code (Sonnet 4.6 high):
    Open Claude Code on:  $WT_CLAUDE
    Select model: Sonnet 4.6 + thinking budget high
    Invoke:       /next-task-bakeoff

  Driver 2 — Cursor (auto mode, mostly Composer 2.5):
    Open Cursor on:       $WT_CURSOR
    Composer: model = auto; paste .claude/commands/next-task-bakeoff.md
    as system prompt; send "Begin."

  Driver 3 — Codex desktop (GPT-5 high):
    Open Codex on:        $WT_GPT5
    Reasoning effort: high; paste .claude/commands/next-task-bakeoff.md
    as system instruction; send "Begin."

  After all three complete, validate the v2 spec-fix assertions:
    bash scripts/verify-bakeoff-v2.sh --all

  Then run the qualitative comparison commands in BAKEOFF.md
  from the main repo at: $REPO_ROOT

EOF
else
cat <<EOF

  SEQUENTIAL workflow (worktrees disabled):

  Driver 1 — Claude Code (Sonnet 4.6 high):
    git checkout bakeoff/claude${SUFFIX}
    /next-task-bakeoff
    (run to BAKEOFF_COMPLETE, then continue)

  Driver 2 — Cursor (auto mode):
    git checkout bakeoff/cursor${SUFFIX}
    (open repo in Cursor, paste system prompt, begin)

  Driver 3 — Codex desktop (GPT-5 high):
    git checkout bakeoff/gpt5${SUFFIX}
    (open repo in Codex, set high reasoning, begin)

  Compare via BAKEOFF.md once all three finish.

EOF
fi
