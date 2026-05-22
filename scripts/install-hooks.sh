#!/usr/bin/env bash
# install-hooks.sh — symlink the autonomous-loop git hooks into .git/hooks/.
#
# Two hooks installed:
#   pre-commit  → scripts/verify-task-commit.sh  (staging + bundling + gates)
#   commit-msg  → scripts/verify-commit-msg.sh   (tier-acknowledgment for
#                                                 escalation-list tasks)
#
# Idempotent: safe to re-run. If a non-symlink hook already exists at the
# target path, it's preserved as <hook>.user-backup so user customizations
# aren't lost.
#
# Companion: scripts/verify-task-commit.sh, scripts/verify-commit-msg.sh,
#            scripts/escalation-list.txt, .claude/commands/next-task.md.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

mkdir -p ".git/hooks"

# install_hook <source-path> <hook-name>
install_hook() {
  local source="$1"
  local name="$2"
  local target=".git/hooks/$name"
  local expected="../../$source"

  if [[ ! -f "$source" ]]; then
    echo "ERROR: hook source '$source' not found." >&2
    exit 1
  fi

  if [[ ! -x "$source" ]]; then
    echo "Making $source executable..."
    chmod +x "$source"
  fi

  # Case: target already a symlink to our hook → idempotent no-op.
  if [[ -L "$target" ]]; then
    local current
    current=$(readlink "$target")
    if [[ "$current" == "$expected" ]]; then
      echo "✓ $name hook already installed (symlink → $source)."
      return 0
    fi
    echo "Existing $name symlink points elsewhere ($current); replacing with $expected."
    rm "$target"
  fi

  # Case: target is a real file (user's previous hook) → back it up.
  if [[ -f "$target" ]]; then
    local backup="${target}.user-backup"
    echo "Existing $name hook found at $target — backing up to $backup."
    mv "$target" "$backup"
  fi

  ln -s "$expected" "$target"
  echo "✓ $name hook installed: $target → $source"
}

install_hook "scripts/verify-task-commit.sh" "pre-commit"
install_hook "scripts/verify-commit-msg.sh"  "commit-msg"

echo ""
echo "  Both hooks fire on commits to 'main' and 'bakeoff/*' branches."
echo "  Feature branches and other branches are skipped (exit 0)."
echo "  Worktrees share .git/hooks/, so installing once covers all of them."
