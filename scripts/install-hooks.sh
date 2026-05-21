#!/usr/bin/env bash
# install-hooks.sh — symlink the autonomous-loop pre-commit hook into .git/hooks/.
#
# Idempotent: safe to re-run. If a non-symlink pre-commit hook already exists,
# it's preserved as pre-commit.user-backup so user customizations aren't lost.
#
# Companion: scripts/verify-task-commit.sh, .claude/commands/next-task.md.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

HOOK_SOURCE="scripts/verify-task-commit.sh"
HOOK_TARGET=".git/hooks/pre-commit"

# Sanity check the source exists and is executable.
if [[ ! -f "$HOOK_SOURCE" ]]; then
  echo "ERROR: hook source '$HOOK_SOURCE' not found." >&2
  exit 1
fi

if [[ ! -x "$HOOK_SOURCE" ]]; then
  echo "Making $HOOK_SOURCE executable..."
  chmod +x "$HOOK_SOURCE"
fi

# Make sure .git/hooks exists (git creates it on init, but be defensive).
mkdir -p ".git/hooks"

# Case: target already a symlink to our hook → idempotent no-op.
if [[ -L "$HOOK_TARGET" ]]; then
  current=$(readlink "$HOOK_TARGET")
  expected="../../$HOOK_SOURCE"
  if [[ "$current" == "$expected" ]]; then
    echo "✓ Pre-commit hook already installed (symlink → $HOOK_SOURCE)."
    exit 0
  fi
  echo "Existing symlink points elsewhere ($current); replacing with $expected."
  rm "$HOOK_TARGET"
fi

# Case: target is a real file (user's previous hook) → back it up.
if [[ -f "$HOOK_TARGET" ]]; then
  backup="${HOOK_TARGET}.user-backup"
  echo "Existing pre-commit hook found at $HOOK_TARGET — backing up to $backup."
  mv "$HOOK_TARGET" "$backup"
fi

# Install the symlink.
ln -s "../../$HOOK_SOURCE" "$HOOK_TARGET"

echo "✓ Pre-commit hook installed: $HOOK_TARGET → $HOOK_SOURCE"
echo "  Hook fires on commits to 'main' and 'bakeoff/*' branches."
echo "  Feature branches and other branches are skipped (exit 0)."
