# Authored-block code generation always uses the frontier model; no per-call toggle

**Status:** accepted (amends D-11 — adds a third LLM-use category; downstream of ADR-0005 + ADR-0011)
**Date:** 2026-05-27

## Context

D-11 provisions two LLM-use categories at install time: a cheap/fast model for comment-to-AI by default, and a frontier model behind a per-comment "thinking" toggle. Both serve **prose editing**.

ADR-0011 (Authored-block authoring UX) and ADR-0005 (scaffold-mismatch regen on receipt) introduce a fundamentally different workload: **code generation**, used in three places that didn't exist when D-11 was written:

1. Initial generation when a consultant authors a new block (ADR-0011)
2. Iteration during preview, as the consultant refines (ADR-0011)
3. Scaffold-mismatch regen on the recipient's side when the host app's scaffold version drifts past the block's (ADR-0005)

Failure asymmetry between prose and code is the key: a clumsy sentence is a clumsy sentence; a buggy block crashes the editor for every consultant Bob shares it with. Cheap-tier models that are adequate for prose are noticeably worse at producing syntactically valid TypeScript that passes the ADR-0006 lint and renders without throwing.

## Decision

Add a third LLM-use category to D-11's provisioning:

| Category | Use | Model class |
|---|---|---|
| `comment-default` (existing) | Comment-to-AI prose edits | Cheap/fast model |
| `comment-thinking` (existing) | Per-comment thinking toggle | Frontier model |
| **`authored-block-generation` (new)** | Initial generation, preview iteration, scaffold-mismatch regen | **Frontier model — always, no toggle** |

The new category uses the install-time-configured frontier model unconditionally. There is no per-call switch to use the cheap model for code gen, by design: a consultant who picks "cheap" to save money will ship a broken block, and the failure is asymmetric enough to forbid the footgun.

The devops install pipeline (D-22) provisions the frontier key and confirms it supports code-generation API calls (some plans don't).

## Rejected alternatives

- **Same two-tier shape as D-11 (cheap default, frontier toggle).** The toggle creates a footgun (consultants pick cheap and ship broken blocks); the savings on the cheap tier are negligible given Authored-block calls are much rarer than comments (a handful per consultant per month vs dozens per day).
- **A separate third provider for code gen.** v1 stays with one vendor (Anthropic) for both prose and code; the same frontier key handles both. Reconsider in v1.1 if a different provider proves dramatically better at the code-gen workload.
- **No new category — overload `comment-thinking`.** Conflates two genuinely different workloads in the cost ledger and the quota; obscures spend attribution. Rejected.

## Consequences

- D-11 is amended in DECISIONS.md with a pointer to this ADR. The original two-category text is preserved; the third category is layered on top.
- Cost ledger (D-34) needs a new tracked category — addressed in the next ADR (D-34 amendment).
- Per-consultant monthly quotas (D-14) need to accommodate the new category. Code-gen calls are larger per call (longer prompts, longer responses) but rarer; first-pass sizing: assume ~5 Authored blocks generated + ~10 preview iterations + ~3 regens per consultant per month, all at frontier prices. Estimated incremental spend: low single-digit dollars per consultant per month; well within D-14's envelope.
- Every consultant install — not just power authors — needs the frontier key provisioned, because the scaffold-mismatch regen fires on the recipient's machine (ADR-0005). Install flow can't ship a "comments-only" tier that lacks the code-gen key.
- An install that only has a cheap key (or whose frontier key lacks code-gen access) cannot author Authored blocks AND cannot receive blocks generated against an older scaffold (regen would fail). This is a degraded mode worth a clear error message in the install flow.
