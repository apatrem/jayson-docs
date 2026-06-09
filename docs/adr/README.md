# Architecture Decision Records

The durable decision record for agentic workflow in this repo (from the [agentic-workflow](https://github.com/apatrem/agentic-workflow) plugin). Read top to bottom — each is self-contained. Product/architecture decisions for jayson-docs itself live in `docs/DECISIONS_LOG.md`.

| # | Decision |
|---|----------|
| [0001](0001-backbone.md) | The backbone is `AGENTS.md` + tests/CI + git/PR — not the orchestrator |
| [0002](0002-buy-engine-build-conventions.md) | Use an external engine (Composio → Superset, amended 2026-06); build only the conventions/policy |
| [0003](0003-human-merge-baseline.md) | Human-merge is the baseline; auto-merge is an earned, opt-in tier |
| [0004](0004-effort-solo-default.md) | Effort/review dial: three tiers (`low \| medium \| hard`), default `low`; prefer low, justify higher |
| [0005](0005-three-phases-human-signoff.md) | Three phases; humans gate planning; competition only in implementation |
| [0006](0006-fail-to-human-not-main.md) | Fail to human, never to `main`; sandboxed workers |
| [0007](0007-exportable-plugin.md) | Packaging: a plugin with a central engine; per-repo is decisions + config only |
| [0008](0008-advanced-auto-merge-tier.md) | Advanced tier (optional, **off by default**): the autonomous auto-merge engine |

**0001–0007 are the baseline** every repo adopts. **0008 is the optional advanced tier** you graduate into per-repo (see 0003).
