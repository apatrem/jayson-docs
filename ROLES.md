# Agent biases (for `hard` competitive best-of-N)

Give each agent a slightly different bias so they don't converge on the same mistake. All implement the **same** task, each in its own worktree, commit locally, and never push/merge.

> **Solo default:** the routine ~90% path (`mode: low`) runs one implementer — the **Cursor Composer** agent by default, the agent you select for the session in Superset (ADR-0002 Update, ADR-0004). The biases below apply only to **`hard`** competitive best-of-N, where you override the agent per lineage.

- **claude** — the cleanest, most readable implementation.
- **codex** — the most test-driven (red → green; cover each acceptance criterion).
- **cursor** — the smallest diff (fewest files/lines; no new abstractions).

Shared rules: smallest correct change; don't touch protected paths or the frozen tests (you may *add* tests); run the gate before finishing.

> Worker orchestration is handled by Superset (ADR-0002 Update). This file is *guidance*, not harness wiring.
