# ADR 0009 — Package manager: pnpm via Corepack (default for new repos; optional for existing)

**Status:** accepted — baseline convention for Node repos (see ADR-0001)

## Context
Workers run in **isolated git worktrees** (ADR-0002 Update / Superset), and the effort dial routinely puts
several in flight at once — `hard` best-of-N across lineages (ADR-0004), plus the operator's routine 2–3
parallel tasks. Under npm/yarn every worktree needs its **own full `node_modules`** (a copy + an install):
N worktrees ≈ N× disk and N installs. The gate must also be **byte-reproducible** across local, each
worktree, and CI. This convention was already baked into the templates (`package.template`, `ci.yaml`,
`AGENTS.template`, the Superset `.superset/config.json` bootstrap) but recorded as a decision **nowhere** —
leaving "is pnpm a mandate?" ambiguous.

## Decision
- **Node repos under this workflow standardise on pnpm via Corepack.** Pin it in `package.json`
  (`"packageManager": "pnpm@<version>"`); the lockfile is `pnpm-lock.yaml` (never also `package-lock.json`
  / `yarn.lock`); CI and the gate run `corepack enable && pnpm install --frozen-lockfile`; per-worktree
  bootstrap is the Superset `.superset/config.json` setup hook.
- **Why pnpm specifically:** its single global content-addressable store **hardlinks** packages into each
  worktree, so a fresh worktree costs ~no extra disk and installs in seconds instead of copying ~the whole
  `node_modules`. Same pnpm everywhere = a reproducible gate.
- **Scope — default, not mandate:**
  - **New repos:** the default; `/agentic-workflow:init` scaffolds it (and never overwrites an existing
    setup).
  - **Existing repos:** **optional.** The cost only bites with concurrency, so migrate a repo only when you
    will **routinely run parallel worktrees** there; otherwise keep its current PM and point the
    per-worktree bootstrap at its existing install command. (**This repo, jayson-docs, stays on npm** — it
    isn't run with routine parallel worktrees, so the concurrency cost doesn't apply; the gate is the npm
    command in `AGENTS.md`/`CLAUDE.md`.)
  - **Non-Node repos:** pnpm is N/A; apply the same *principle* — a cheap, reproducible per-worktree
    dependency bootstrap — with that toolchain.

## Consequences
- pnpm's stricter, non-flat `node_modules` can surface **phantom-dependency** errors on migration (a package
  importing something it never declared); the gate catches them immediately.
- One fewer thing to decide per repo; the gate command is uniform across the fleet.
- It is a **default, not lock-in** — a repo with a strong reason for another PM overrides locally, consistent
  with per-repo config ownership (ADR-0007).
