# AGENTS.md

Operational guardrails for any agent (Claude Code, subagents, contributors)
working in this repository.

## Repository layout

```
.
├── AGENTS.md                       ← you are here
├── CLAUDE.md                       ← redirects to this file
├── README.md                       ← short orientation
├── brand.example.yaml              ← brand-token reference shape
├── blocks.catalogue.yaml           ← 15 pre-built block specs + setup-AI instructions
├── docs/                           ← all design/spec docs
│   ├── DOCUMENT_SYSTEM_ARCHITECTURE.md  — the "why" memo
│   ├── BUILD_BRIEF.md                   — milestones M0–M6 + acceptance
│   ├── DECISIONS.md                     — 33 settled decisions + roadmap + open items
│   ├── TYPES.md                         — all shared TypeScript types
│   ├── BLOCK_IMPLEMENTATION_GUIDE.md    — copy-pattern for the 15 blocks
│   ├── SETUP_PIPELINE.md                — AI ingestion + code-gen pipeline spec
│   └── TASKS.md                         — ~112 atomic tasks ≤4h each
├── examples/                       ← valid + invalid YAML/JSON fixtures
│   ├── sample-proposal.yaml
│   ├── sample-deck.yaml
│   ├── sample-block-patch.json
│   ├── sample-comment-thread.json
│   ├── sample-llm-batch-request.json
│   ├── sample-llm-batch-response.json
│   └── invalid/                    ← each one fails validation in a documented way
└── reference/
    └── callout/                    ← one fully-worked block: schema + renderer + node + test
```

## Required reading

Before editing anything, read in this order:

1. [docs/DOCUMENT_SYSTEM_ARCHITECTURE.md](docs/DOCUMENT_SYSTEM_ARCHITECTURE.md) — the architecture memo. The "why" behind every constraint.
2. [docs/BUILD_BRIEF.md](docs/BUILD_BRIEF.md) — what to build, milestones, acceptance.
3. [docs/DECISIONS.md](docs/DECISIONS.md) — recorded decisions. Treat as binding.

If the brief and the memo conflict, the memo's §2 principle and §3 requirements win — stop and ask.

## Reference reading (consult as needed)

- [docs/TYPES.md](docs/TYPES.md) — every shared TypeScript type lives here. No type is defined twice.
- [docs/TASKS.md](docs/TASKS.md) — atomic backlog. Use task IDs (`T-NN`) in commit messages and PRs.
- [docs/BLOCK_IMPLEMENTATION_GUIDE.md](docs/BLOCK_IMPLEMENTATION_GUIDE.md) — the copy-pattern for the 15 blocks; the canonical example is `reference/callout/`.
- [docs/SETUP_PIPELINE.md](docs/SETUP_PIPELINE.md) — full spec of the setup AI pipeline including the constrained code-gen scaffold and lint rules.
- [examples/](examples/) — use as test fixtures and few-shot context.
- [reference/callout/](reference/callout/) — copy this pattern, do not invent a new one.
- [blocks.catalogue.yaml](blocks.catalogue.yaml) and [brand.example.yaml](brand.example.yaml) — the data specs the schema validates against.

## Planning workflow

**All non-trivial plans must go through the `grill-me` skill.** Before writing
code for any new feature, milestone, or refactor:

1. Draft the plan.
2. Invoke `grill-me` to stress-test it — resolve every branch of the decision
   tree before implementation begins.
3. Only after the grilling settles should code land.

This applies to anything bigger than a one-file edit or a typo fix.

## Code intelligence

This project uses **CodeGraph** for semantic code exploration. If `.codegraph/`
is not yet initialized, run `codegraph init -i` before doing significant
exploration work.

Prefer codegraph tools over `grep`/`find` for:

- `codegraph_search` — locate symbols by name
- `codegraph_context` — pull relevant code for a task
- `codegraph_callers` / `codegraph_callees` — trace call flow
- `codegraph_impact` — assess blast radius before changing a symbol
- `codegraph_node` — fetch a symbol's source + metadata

When spawning Explore subagents, instruct them to use codegraph tools.

For pre-merge review, use the `code-review-and-quality` skill (multi-axis
review across correctness, readability, architecture, security, performance).

## Shell tooling

Use **RTK (Rust Token Killer)** for shell operations — it transparently
rewrites common commands (`git`, `ls`, etc.) to save 60–90% on tokens. The
Claude Code hook handles rewriting automatically; just run commands normally.

Meta commands (run `rtk` directly):
- `rtk gain` — token savings analytics
- `rtk discover` — find missed savings opportunities
- `rtk proxy <cmd>` — bypass filtering for debugging

## Hard guardrails (from docs/BUILD_BRIEF.md §0)

- **Greenfield.** No code/schema/config from prior prototypes.
- **Open-source only.** No Tiptap Pro/Cloud, no paid SaaS. LLM is the sole
  non-OSS component.
- **DocModel is canonical** (memo §2). Editor state and CRDT docs are
  projections, never sources of truth.
- **Closed block library.** 15 pre-built blocks + up to 10 AI-generated
  per-consultancy blocks gated by the human-review pipeline in
  `docs/SETUP_PIPELINE.md`. No off-catalogue block types.
- **No telemetry.** Operational cost-tracking only, per D-32/D-34. The local
  cost ledger stores cost-computation fields exclusively — never prompt
  content, response content, or behavioral signal.
- **Do not build** anything in memo §10 (think-cell clone, deck editor,
  DOCX/PPTX import/export, v1 real-time collab, live-models platform).
- **Demo Office files are reference only** — never parse or generate them
  at runtime (the setup-time pipeline is the sole exception).
- **When uncertain, stop and ask.** Use `TBD` and flag it; do not invent brand
  values, client content, or block types.

## Working style

- Build milestone-by-milestone. Do not start a milestone until the previous
  one's acceptance criteria pass.
- Work tasks from `docs/TASKS.md` in dependency order. Reference task IDs
  (`T-NN`) in commit messages and PR titles.
- Prefer editing existing files over creating new ones.
- Don't add features, abstractions, or error handling beyond what the task
  requires.
- Default to no comments. Only write a comment when the *why* is non-obvious.
- For any new block: copy the four-file pattern from `reference/callout/`.
  Do not invent a new shape.
