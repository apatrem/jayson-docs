#!/usr/bin/env bash
# Superset workspace setup — runs in each new worktree on creation.
# Uses Corepack to honor package.json "packageManager"; no global pnpm shim needed.
set -euo pipefail

if ! command -v corepack >/dev/null 2>&1; then
  echo "Corepack is required. Use the Node version in .nvmrc or install Corepack." >&2
  exit 1
fi

echo "→ Installing dependencies (Corepack + pinned pnpm)..."
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm install --frozen-lockfile

echo "✓ Workspace ready"
