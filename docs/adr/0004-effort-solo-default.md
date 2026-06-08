# ADR 0004 — Effort dial: solo by default; competitive best-of-N for the hard ~10%

**Status:** accepted

## Context
With several capable, *heterogeneous* agents (Claude, Codex, Cursor), two orchestration shapes
exist: collaborative (split one task across agents, integrate) or competitive (all solve the same
task, keep the best). Heterogeneity only pays when approaches diverge — i.e. competitively; a real
run confirmed the three produce meaningfully different solutions (one won on rigor, another on API
design, another on size). But running N agents on *every* task costs ~N× and is wasted on routine work.

## Decision
- Effort is a **per-task dial, `mode: solo | competitive`, default `solo`** — one implementer +
  the deterministic gate + one adversarial reviewer.
- **Competitive best-of-N is reserved for hard / ambiguous / risky / security tasks (~10%):** N
  agents implement the same task in isolated worktrees; the best is selected/synthesized. Under
  Composio this is run **manually** (same task, agent overridden — ADR-0002).
- **Collaborative split is rejected:** three contracts with nothing to integrate them against, and
  it wastes the vendor diversity.

## Consequences
- Cost tracks value; diversity is leveraged exactly where it pays.
- The richer synthesizer + cross-lineage-review machinery for best-of-N lives in the advanced tier
  (ADR-0008); the baseline keeps best-of-N as a manual "pick the best of N branches."
