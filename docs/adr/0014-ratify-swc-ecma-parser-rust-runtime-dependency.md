# Ratify `swc_ecma_parser` as a Rust runtime dependency for Authored-block lint-at-receive

**Status:** accepted (R10 ratification for the new Rust runtime dep T-163 requires; prerequisite of T-163 in `docs/TASKS.md`)
**Date:** 2026-05-27

## Context

R10 (build/runtime stack must be open source) and the BUILD_BRIEF's pinned-dependency discipline require explicit approval before any new runtime dependency lands in `Cargo.toml` or `package.json`. ADR-0006 + ADR-0013 + M9b task T-163 need a TypeScript-AST parser running inside the Tauri Rust sidecar to lint received Authored blocks and extract their `defineAuthoredBlock({...})` data without shipping a JavaScript parser into the renderer (which the BUILD_BRIEF prohibits for runtime code).

`swc_ecma_parser` is the standard mature Rust-native TypeScript-AST parser, Apache-2.0 licensed, widely used in production tooling (Next.js, Deno, Parcel). No Node dependency, no transitive C/C++ build-time toolchain beyond what `cargo` already provides.

## Decision

`swc_ecma_parser` is **accepted** as a Rust runtime dependency in `src-tauri/Cargo.toml`. T-163 may proceed.

The dep is scoped to `src-tauri/src/lint/` (the Authored-block sidecar) — it must not leak into other Tauri modules without a separate decision. If `swc_ecma_parser` proves not to fit (e.g., spec drift against TypeScript's grammar that the Authored-block lint depends on), the fallback is a hand-rolled parser sufficient for the literal-only subset the runtime needs to accept per ADR-0013, not a swap to a different parser library.

## Rejected alternatives

- **Ship `@typescript-eslint/parser` in the renderer.** The BUILD_BRIEF prohibits parser/static-analysis tooling in the editor/renderer runtime bundle (the prohibition is explicit and pre-dates M9). Bypassing it would also add ~1 MB to the renderer bundle and grow the most-attacked layer's dependency surface.
- **Hand-rolled Rust parser sufficient for the literal-only subset.** Doable (ADR-0013 narrows the parseable surface dramatically — no function values, no template interpolation, no JSX expressions), but writing and maintaining a TypeScript-syntax parser from scratch is a meaningful cost paid against a real-world TS grammar that evolves. Kept as the fallback if `swc_ecma_parser` ever proves unsuitable.
- **Run the existing TypeScript lint (`src/setup/lint-generated.ts`) in a Node sidecar process spawned by Tauri.** Adds a Node runtime to the install footprint — significantly heavier than a Rust crate, and introduces a second language's runtime to the production app. Rejected.
- **Skip runtime lint entirely; rely on the author's machine running the build-time lint at generation time.** Trust-model regression — the recipient cannot verify the sender ran the lint correctly. Rejected per ADR-0006.

## Consequences

- `src-tauri/Cargo.toml` gains the `swc_ecma_parser` dep when T-163 lands; `Cargo.lock` updates accordingly.
- The Authored-block lint rule set now lives in two implementations (TypeScript at setup-time via `src/setup/lint-generated.ts`; Rust at receive-time via the sidecar). They must stay in sync — T-163 enforces this via the shared CI fixture set under `tests/blocks/authored/fixtures/` ("both lints agree" — not just "both lints exist").
- The BUILD_BRIEF's parser-prohibition language for the editor/renderer bundle is unaffected — `swc_ecma_parser` runs in the Tauri Rust sidecar (`src-tauri/src/lint/`), not in the renderer. A future BUILD_BRIEF update should clarify the Rust-runtime carve-out so the prohibition language doesn't read as forbidding all parser tooling everywhere.
- T-163's "first sub-step" pause (`mark task [?] if unratified, halt`) is removed. T-163 may proceed without further human gating.
