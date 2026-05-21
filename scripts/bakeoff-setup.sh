#!/usr/bin/env bash
# bakeoff-setup.sh — create the three local-only bake-off branches.
#
# Run once before launching any driver. Idempotent: if branches/tag already
# exist, the script verifies them and exits cleanly. Refuses to run if the
# tree isn't clean on main.
#
# Companion to BAKEOFF.md and .claude/commands/next-task-bakeoff.md.

set -euo pipefail

BRANCHES=(
  "bakeoff/claude"
  "bakeoff/cursor"
  "bakeoff/gpt5"
)
TAG="bakeoff-start"

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

# Ensure we're still on main
git checkout main >/dev/null 2>&1

# ── Report ─────────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo " Bake-off ready. Branches (local-only, NOT pushed):"
echo "═══════════════════════════════════════════════════════════════════"
git branch --list 'bakeoff/*' -v
echo ""
echo " Recovery tag:"
git tag --list "$TAG" | sed 's/^/   /'
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo " Next steps — see BAKEOFF.md for full instructions per driver:"
echo "═══════════════════════════════════════════════════════════════════"
cat <<'EOF'

  Driver 1 — Claude Code (Sonnet 4.6 high):
    git checkout bakeoff/claude
    # In Claude Code: select Sonnet 4.6 + thinking budget high
    /next-task-bakeoff

  Driver 2 — Cursor (auto mode, mostly Composer 2.5):
    git checkout bakeoff/cursor
    # Open repo in Cursor; paste .claude/commands/next-task-bakeoff.md
    # into Composer's system prompt; model = auto; send "Begin."

  Driver 3 — Codex desktop (GPT-5 high):
    git checkout bakeoff/gpt5
    # Open repo in Codex; reasoning effort = high; paste
    # .claude/commands/next-task-bakeoff.md as the system instruction;
    # send "Begin."

After all three complete, run the comparison commands in BAKEOFF.md.
EOF
