# No iframe sandbox for AI-generated blocks; rely on layered static defenses + a runtime watchdog

**Status:** accepted (supersedes D-09 mitigation #5 as originally written)
**Date:** 2026-05-21

## Context

`D-09` originally required every AI-generated block to render inside a CSP-constrained iframe in the editor, as a defense-in-depth measure on top of the existing static defenses (constrained scaffold, whitelisted imports, forbidden patterns, human review gate, regen pipeline).

At the design-for-200-node-views, ~10-generated-block-instances-per-doc scale (anchored during the O-08 resolution), the iframe approach costs ~500MB resident memory and seconds of mount time per editor open, in exchange for marginal protection beyond what the lint and review already provide.

## Decision

Drop the iframe sandbox. Replace with three layered defenses:

1. **Stricter lint** — extend the forbidden-patterns list to cover `parent`, `top`, `window.localStorage`, `document.cookie`, `postMessage`, monkey-patching of intrinsics. Enforced at build time; CI fails on any violation.
2. **Runtime render-budget watchdog** — wrap every generated-block render in a measurement; if a single render exceeds the budget (50ms), the editor unmounts the block and shows an error placeholder. Bounds the runaway-loop / leak threat the iframe was the strongest argument for.
3. **Whitelisted imports + human review gate** — unchanged from D-09 mitigations #1–4 + #6.

## Rejected alternatives

- **Keep the iframe (original D-09 #5).** Pays ~500MB memory + slow mount for ~15% marginal protection; complicates editor architecture (cross-frame postMessage for selection, undo, comment anchoring).
- **Web Worker for compute-heavy generated blocks only.** Workers can't render DOM, so this would only isolate computation. Most generated blocks are render-bound; the worker pattern doesn't fit the dominant case.

## Consequences

- The runtime watchdog must be built before any generated block can render (new task in M1).
- A future regression — where the whitelist or lint is loosened — loses the iframe floor. The mitigation is to keep the lint extension list explicit and code-reviewed.
- If a generated block somehow gets through all static defenses and mutates global state, this design does not contain it. Accepted: that's a layered failure of three independent defenses, and the right response is to harden the lint, not to retrofit an iframe.
- DECISIONS.md D-09 mitigation #5 is updated to point at this ADR.
