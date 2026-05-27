# Authored blocks are parsed as declarative data, never executed as code

**Status:** accepted (foundational constraint underneath ADR-0005, ADR-0006, ADR-0008; resolves a gap surfaced during M9 plan review)
**Date:** 2026-05-27

## Context

ADR-0005 says Authored blocks travel as `.tsx` files with a manifest header. ADR-0006 says a lint runs at receive time. ADR-0008 says the runtime registry "expands the manifest into a TipTap node + node view + renderer + mapping." Nothing in the existing record says what happens *after* the lint passes — specifically, whether the `.tsx` is loaded as executable source or interpreted as data.

Plan review surfaced that this gap matters at the security boundary. A production Tauri bundle cannot simply `import()` arbitrary TypeScript from `generated-blocks/active/`. On-disk transpilation or `eval`/`Function`-based execution would collide with the lint's own prohibitions (no `eval`, no `Function`) and would turn every received block into a runtime code-execution channel — exactly the surface the lint + watchdog gate was designed to keep small.

There are two coherent interpretations of "the `.tsx` file":

1. **Executable source.** The runtime parses, transpiles, and evaluates the file. The lint is a safety check before evaluation. Implication: the renderer ships a TypeScript transpiler (or runs one in a sidecar) and the receive flow is a controlled code-execution boundary.
2. **Declarative data.** The runtime parses the file's AST, locates a single `defineAuthoredBlock({...})` call, validates every node inside that object literal is a static value, extracts it as a typed `AuthoredBlockManifest` (a plain JSON-equivalent value), and discards the rest. No transpilation, no evaluation. The runtime registry consumes the extracted manifest and builds the TipTap node + node view + renderer + mapping using **built-in, app-bundled code**. The `.tsx` extension is a serialisation convenience — diffable, emailable, lintable with TypeScript tooling — not an indication of runtime code execution.

## Decision

**Interpretation 2: declarative data only.** An Authored block file is parsed as a strict `defineAuthoredBlock({...})` object literal. Everything inside the literal must be statically evaluable. Anything outside the literal (top-level statements, side effects, additional exports, imports beyond the narrow allow-list) is a lint failure and quarantines the block. The runtime never `eval`s, never `import()`s the file, never transpiles it. The runtime registry is the *only* code that constructs the TipTap node + view + renderer + mapping; the Authored block file supplies only the data those constructors consume.

Concretely, the constraints the AST validator enforces:

- File must default-export exactly one `defineAuthoredBlock({...})` call (per ADR-0008).
- No top-level statements other than the default export and (optionally) typed imports of `defineAuthoredBlock` itself, the brand-token types, and the schema-type definitions.
- Every value inside the object literal must be statically evaluable: string/number/boolean/null literals, enum string literals, array literals containing the same, nested object literals. **No** function expressions, arrow functions, method shorthand, computed property keys, template strings with non-literal interpolation, spread of non-literal identifiers, JSX expressions with arbitrary expression children.
- No imports outside the Authored-specific allow-list (narrower than ADR-0001's general lint allow-list): the `defineAuthoredBlock` helper, schema-type symbols, brand-token type references. No React, no TipTap, no echarts, no `fs`, no anything else.
- Manifest header (ADR-0005) is present and parseable.

The AST validator + extractor is implemented as a Tauri Rust sidecar using `swc_ecma_parser` (per ADR-0006's revised lint-at-receive plan), not as TypeScript in the renderer bundle.

## Rejected alternatives

- **Executable source with a runtime TS transpiler.** Adds ~1MB to the renderer bundle (transpiler + AST tooling) and creates a runtime code-execution boundary that the existing lint + watchdog were never designed to be the sole defence of. The lint's "no `eval`, no `Function`" rules become hypocritical when the receive flow itself runs the equivalent of `eval`.
- **Executable source via dynamic `import()` of an on-disk file.** Tauri's CSP and the architecture's general "no off-bundle code" stance don't accommodate this. Even with permissive CSP, the receive flow becomes the trust boundary that every Authored block crosses, and the lint cannot statically prove safety of arbitrary executable TS.
- **Executable source via a sandboxed iframe.** Considered and rejected for Standard/Brand generated blocks already in ADR-0001 (iframe overhead, cross-frame complexity for selection/comment-anchoring). The same arguments apply here, plus the iframe wouldn't avoid the transpiler-shipping cost.
- **Pure JSON files instead of `.tsx`.** Loses the diff-friendliness, the type-checking the author gets at generation time, the lintable surface that catches malformed manifests at generation time too. The `.tsx` extension is essentially "JSON in a constrained TypeScript wrapper" — pays for diffability and tooling at no runtime cost.

## Consequences

- **The Authored capability ceiling (ADR-0007) becomes a hard architectural property, not a lint policy.** Because the manifest is data and the runtime is built-in code, an Authored block literally cannot ship custom runtime behaviour — there is no execution path to ship it through. The deferred "extended Authored capabilities" feature in ADR-0007 cannot be added by relaxing the lint alone; it requires either (a) widening `defineAuthoredBlock`'s declarative shape (more built-in runtime code that consumes more declarative fields) or (b) revisiting this ADR with a sandboxed execution model.
- **The AST validator is the security gate.** The lint rule set (ADR-0001 + ADR-0006) still runs to catch the patterns it always caught, but for Authored blocks specifically the "literal-only, strict shape" check is the load-bearing constraint. A bug in the validator that lets a non-literal node through is the entire trust boundary.
- **ADR-0008's "registry expands the manifest" wording is reaffirmed.** That phrase was always the right framing; this ADR makes it explicit and exclusive. The runtime registry's `defineAuthoredBlock` expander code IS the runtime; the Authored file IS data.
- **The `.tsx` extension is misleading-by-design** — chosen for ergonomic reasons (diffability, IDE syntax highlighting, lint reuse) rather than because the file is runnable TypeScript. The Authored-block authoring UX (ADR-0011) and the share flow should not encourage authors to think of the file as a script.
- **A future v1.1 hardening pass should verify** that the AST validator's rule set has no escape — e.g., that the validator rejects every fixture in `tests/blocks/authored/malicious-fixtures/` representing attempted-execution patterns (function values, computed keys, template interpolation, JSX expressions, dynamic imports masquerading as static, etc.).
