# src/llm/ — intentionally empty

This directory is intentionally empty for v1.

**Claude-in-Cowork is the LLM** for this project. Fill-plan generation happens in a Cowork chat using the user's existing subscription, not in this codebase. The CLI under `src/cli/` and the pipeline under `src/pipeline/` do pure template-fill against a fill-plan JSON the skill writes to a temp file.

See:

- `skills/` — the four skills that drive generation: {commercial-proposal, report} × {pptx, docx}, read by any agentic LLM (BYO LLM, D15).
- `docs/DECISIONS_LOG.md` D11 — the decision to remove the in-tree LLM client.
- `AGENTS.md` — handoff brief.

If you later add a standalone (non-Cowork) LLM path — for batch generation, CI, scheduled runs — that code would land here. Do not add it speculatively.
