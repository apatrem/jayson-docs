#!/usr/bin/env bash
# Superset workspace setup — runs in each new worktree on creation.
# Assumes pnpm (pinned: pnpm@11.5.2, see package.json "packageManager") is
# already globally available on the machine.
set -euo pipefail

echo "→ Installing dependencies (pnpm install --frozen-lockfile)..."
pnpm install --frozen-lockfile

echo "✓ Workspace ready"
