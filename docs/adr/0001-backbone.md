# ADR 0001 — The backbone is AGENTS.md + tests/CI + git/PR

**Status:** accepted

## Context
The orchestration tooling is an execution convenience, not the source of truth. Git, tests, and
diffs are the source of truth: *"boring around the model, aggressive around verification."* If the
spine of the workflow is a particular harness or vendor, the whole approach rots when that tool
changes. It must not.

## Decision
The load-bearing spine of every repo is **`AGENTS.md`** (the cross-tool source of truth — workflow,
rules, the gate, definition-of-done) + a **deterministic gate (build/lint/test/typecheck) enforced
by CI required checks on a protected `main`** + **small PRs**. Planning (grill-me), navigation
(codegraph / code-review-graph), and the execution engine are **tools that plug into** that spine —
never the spine itself.

## Consequences
- Vendor and tool choices (the engine, which CLIs, which graph tool) become swappable; the backbone
  is stable.
- Graph and AI tools are treated as **navigation and assistants, not proof**. CI decides.
- If the engine is ever dropped, the backbone and these conventions are unaffected.
