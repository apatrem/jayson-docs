# Document System

A consulting document system. Designed in detail. Not yet built.

## What's here

- Design decisions. Types. Examples. Two worked blocks. UI wireframes. Drop-in configs.
- Enough scaffolding to hand to a developer or an LLM.

## What's not here

- Any code that runs. Yet.

## Where to look

| If you want... | Read this |
|---|---|
| The rules | [`AGENTS.md`](AGENTS.md) |
| Why we built it this way | [`docs/DOCUMENT_SYSTEM_ARCHITECTURE.md`](docs/DOCUMENT_SYSTEM_ARCHITECTURE.md) |
| What to build | [`docs/BUILD_BRIEF.md`](docs/BUILD_BRIEF.md) |
| The settled decisions | [`docs/DECISIONS.md`](docs/DECISIONS.md) |
| ~112 bite-sized tasks | [`docs/TASKS.md`](docs/TASKS.md) |
| Every shared TypeScript type | [`docs/TYPES.md`](docs/TYPES.md) |
| How to implement a block | [`docs/BLOCK_IMPLEMENTATION_GUIDE.md`](docs/BLOCK_IMPLEMENTATION_GUIDE.md) |
| The setup AI pipeline | [`docs/SETUP_PIPELINE.md`](docs/SETUP_PIPELINE.md) |
| The install CLI flow | [`docs/SETUP_INSTALL_FLOW.md`](docs/SETUP_INSTALL_FLOW.md) |
| JS↔Rust commands (Tauri) | [`docs/TAURI_IPC.md`](docs/TAURI_IPC.md) |
| Byte-stable YAML rules | [`docs/YAML_FORMAT.md`](docs/YAML_FORMAT.md) |
| Review-panel UI design | [`docs/UI_REVIEW_PANEL.md`](docs/UI_REVIEW_PANEL.md) |
| Library UI design | [`docs/UI_LIBRARY.md`](docs/UI_LIBRARY.md) |
| Drop-in project configs | [`starter/`](starter/) |
| Block-primitives (every renderer depends on these) | [`reference/primitives/`](reference/primitives/) |
| A simple worked block | [`reference/callout/`](reference/callout/) |
| A complex worked block (chart) | [`reference/chart/`](reference/chart/) |
| DocModel ⇄ editor orchestrator | [`reference/mapping/`](reference/mapping/) |
| Valid + invalid fixtures | [`examples/`](examples/) |
| The brand-token shape | [`brand.example.yaml`](brand.example.yaml) |
| The 15 pre-built block specs | [`blocks.catalogue.yaml`](blocks.catalogue.yaml) |

## Quick start (for humans)

1. Read `AGENTS.md`. Five minutes.
2. Read `docs/DOCUMENT_SYSTEM_ARCHITECTURE.md`. Twenty minutes.
3. Read `docs/BUILD_BRIEF.md`. Ten minutes.
4. Open `docs/DECISIONS.md` when something feels arbitrary. It probably isn't.
5. Run `scripts/check-specs` before implementing from the machine-readable specs.

## Quick start (for LLMs)

Same as above. In parallel.

## Status

Designed. Grilled. Decided. ~10–11 weeks of focused work to v1.

## Spec sanity check

This repo is docs-first, but the YAML/JSON files are executable specs. Run:

```bash
scripts/check-specs
```

It parses every YAML and JSON spec/fixture file using only the system Ruby
standard library. Schema validation comes later in M1a.

## Stack (planned)

Tauri · React · TypeScript · TipTap · Zod · ECharts · Playwright.

No PowerPoint. No Word. No live data. No regrets.
