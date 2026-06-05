# jayson-docs

Template-fill CLI for consulting-firm deliverables — driven by your **own** agentic LLM (BYO LLM: Cowork, Claude Code, Cursor, …). Acme is the reference firm; per-firm **Setup** is **post-v1** (see `docs/SETUP_PIPELINE.md`).

- **Deliverables (target):** four — commercial proposal (`.pptx` + `.docx`) and report (`.pptx` + `.docx`). **v1 implements `report-pptx` first** as a walking skeleton (DECISIONS_LOG D20).
- The CLI is pure mechanical fill: master template + fill-plan JSON → output file. **No LLM call in this codebase.**
- Your own agentic LLM supplies the fill-plan, via the skills under `skills/` (BYO LLM, D15); no API key is required.

## Start here

**New here? Read [`OVERVIEW.md`](OVERVIEW.md) first** — the canonical foundations (the one principle, the four-phase lifecycle, the decision index D1–D21, the consolidated roadmap) and a map to every other doc. Then, for implementation:

1. Read `AGENTS.md` at the repo root — handoff for the implementing coding agent.
2. Read the four design docs in `docs/`:
   - `docs/ARCHITECTURE.md` — *why*
   - `docs/BUILD_BRIEF.md` — *what to do*, milestone-by-milestone
   - `docs/SLIDE_LAYOUT_LIBRARY.md` — slide-layout spec for the PPTX masters
   - `docs/DECISIONS_LOG.md` — what was decided, what was rejected, and why
3. Read `CHART_CATALOGUE.md` and `ERROR_HANDLING.md` for the two contracts the docs reference.
4. Read `skills/README.md` for the four-skill plugin layout.
5. Drop the master templates into `templates/` (see `templates/README.md`).
6. For **per-firm setup** (multi-firm onboarding): `docs/SETUP_PIPELINE.md` (how the Setup skill builds a firm's Install), `docs/SETUP_GUIDE.md` (the non-programmer walkthrough), and `firm-context-template/` (the reserved firm-context folder a firm copies).

## Setup

```bash
npm install
npm run validate           # schema-checks the fixtures
npm run test               # runs the test suite
```

## Fill (once M2–M4 are implemented)

```bash
npm run fill -- \
  --template templates/commercial-proposal.master.pptx \
  --plan tmp/plan.json \
  --out      out/proposal-acme.pptx
```

The CLI dispatches on the `--template` extension. Use `.pptx` for the PPTX pipeline (M2/M3) and `.docx` for the DOCX pipeline (M4).

## Delivery — portable skills pack + app (BYO LLM)

The product is a portable `skills/` folder of markdown playbooks + the standalone app, driven by the user's **own** agentic LLM (Claude Cowork, Claude Code, Cursor, ChatGPT-with-tools, a local model). Each SKILL.md instructs the LLM to gather a brief, produce a schema-valid fill-plan, and invoke this CLI — or hand the fill-plan to the human to run. A **Cowork plugin is one optional packaging**. See `docs/DECISIONS_LOG.md` D15 and `skills/README.md`.

## Stack

Open-source only. The LLM is your own agentic LLM (BYO LLM, D15). See `docs/ARCHITECTURE.md` §5.

- `pptx-automizer` + `pptxgenjs` — PPTX template-fill + dynamic chart objects
- `docx` (dolanmiu) — DOCX template-fill via `patchDocument`
- `zod` — schema definition and fill-plan validation
- `yaml` — config / brand parsing
- `commander` — CLI
- TypeScript, Vitest, ESLint, Prettier
