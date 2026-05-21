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
│   ├── DECISIONS.md                     — settled decisions + roadmap + open items
│   ├── TYPES.md                         — all shared TypeScript types
│   ├── BLOCK_IMPLEMENTATION_GUIDE.md    — copy-pattern for the 15 blocks
│   ├── SETUP_PIPELINE.md                — AI ingestion + code-gen pipeline spec
│   ├── SETUP_INSTALL_FLOW.md            — per-consultant install CLI wizard
│   ├── TAURI_IPC.md                     — JS↔Rust command list with signatures
│   ├── YAML_FORMAT.md                   — byte-stable serialization rules
│   ├── UI_REVIEW_PANEL.md               — wireframe for the comment-review panel
│   ├── UI_LIBRARY.md                    — wireframe for the doc library
│   └── TASKS.md                         — ~112 atomic tasks ≤4h each
├── starter/                        ← drop-in project configs (M0 starter pack)
│   ├── package.json                — pinned dependency versions
│   ├── tsconfig.json               — strict TS + path aliases
│   ├── vite.config.ts              — Tauri-aware build config
│   ├── vitest.config.ts            — happy-dom test config
│   ├── .eslintrc.cjs               — arch-invariant lint rules
│   ├── .prettierrc                 — formatting
│   └── src-tauri/
│       ├── tauri.conf.json         — CSP + asset-scope + bundle settings
│       ├── Cargo.toml              — Rust deps incl. keyring
│       ├── src/lib.rs              — IPC command registration
│       └── src/main.rs             — native binary entry point
├── examples/                       ← valid + invalid YAML/JSON fixtures
│   ├── sample-proposal.yaml
│   ├── sample-deck.yaml
│   ├── sample-block-patch.json
│   ├── sample-comment-thread.json
│   ├── sample-llm-batch-request.json
│   ├── sample-llm-batch-response.json
│   └── invalid/                    ← each one fails validation in a documented way
└── reference/                      ← fully-worked code patterns to copy
    ├── primitives/                 — block-primitives: BrandProvider, ProseRenderer, helpers
    ├── callout/                    — reference block: schema + renderer + node + test
    ├── chart/                      — second worked block: ECharts + side panel
    └── mapping/                    — DocModel ⇄ editor orchestrator with losslessness invariant
```

## Required reading

Before editing anything, read in this order:

1. [docs/DOCUMENT_SYSTEM_ARCHITECTURE.md](docs/DOCUMENT_SYSTEM_ARCHITECTURE.md) — the architecture memo. The "why" behind every constraint.
2. [docs/BUILD_BRIEF.md](docs/BUILD_BRIEF.md) — what to build, milestones, acceptance.
3. [docs/DECISIONS.md](docs/DECISIONS.md) — recorded decisions. Treat as binding.

If the brief and the memo conflict, the memo's §2 principle and §3 requirements win — stop and ask.

## Reference reading (consult as needed)

### Specifications
- [docs/TYPES.md](docs/TYPES.md) — every shared TypeScript type lives here. No type is defined twice.
- [docs/TASKS.md](docs/TASKS.md) — atomic backlog. Use task IDs (`T-NN`) in commit messages and PRs.
- [docs/BLOCK_IMPLEMENTATION_GUIDE.md](docs/BLOCK_IMPLEMENTATION_GUIDE.md) — copy-pattern for the 15 blocks.
- [docs/SETUP_PIPELINE.md](docs/SETUP_PIPELINE.md) — setup AI pipeline (ingestion + code-gen + lint).
- [docs/SETUP_INSTALL_FLOW.md](docs/SETUP_INSTALL_FLOW.md) — per-consultant install CLI prompts.
- [docs/TAURI_IPC.md](docs/TAURI_IPC.md) — every JS↔Rust command with signatures.
- [docs/YAML_FORMAT.md](docs/YAML_FORMAT.md) — formatter rules that guarantee byte-stable round-trips.
- [docs/UI_REVIEW_PANEL.md](docs/UI_REVIEW_PANEL.md) — wireframe + state model for the comment-review panel.
- [docs/UI_LIBRARY.md](docs/UI_LIBRARY.md) — wireframe + state model for the doc library.

### Worked code (copy these patterns; do not invent new ones)
- [reference/primitives/](reference/primitives/) — block-primitives. **Foundation — every block depends on these.**
- [reference/callout/](reference/callout/) — the canonical simple block (4-file pattern).
- [reference/chart/](reference/chart/) — second worked block introducing cross-field schema, atom nodes, JSON-encoded payload, side panel, SSR render path.
- [reference/mapping/](reference/mapping/) — top-level DocModel ⇄ editor orchestrator with losslessness invariant.

### Drop-in scaffolding
- [starter/](starter/) — pinned configs for `npm init`, Tauri 2.x setup, ESLint, Prettier, Vitest.

### Data specs
- [blocks.catalogue.yaml](blocks.catalogue.yaml) — the 15 pre-built block specs.
- [brand.example.yaml](brand.example.yaml) — brand-token reference shape.
- [examples/](examples/) — valid + invalid YAML/JSON fixtures (use as test inputs and few-shot LLM context).

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
