# Authored-block authoring: in-document, preview-first hybrid, AI sees the document

**Status:** accepted (concretises the consultant-facing surface for Authored-block creation; downstream of ADR-0004 / ADR-0007 / ADR-0008)
**Date:** 2026-05-27

## Context

ADR-0008 specifies the file shape an Authored block must end in (`.tsx` with manifest header, `defineAuthoredBlock(...)` default export). It does not specify how a consultant produces that file — what UI they see, where in the app they trigger it, or what context the AI has when generating.

Three interaction shapes (chat-only, structured form, preview-first hybrid), two locations (in-document vs standalone), and two AI-context options (sees document content vs blind) cover the design space.

## Decision

**Interaction: preview-first hybrid.** The consultant types a short description in one box; the AI generates a draft block; the result renders live in a preview pane; the consultant refines via follow-up chat *or* by editing the structured manifest fields directly. The chat surface and the structured-fields surface stay in sync — they're two views of the same in-progress manifest.

**Location: in-document.** "Create new Authored block" is triggered from the BlockPalette inside the open document. Authored blocks are born from a specific document need; divorcing authoring from the document loses the originating context.

**AI context: sees document content.** Generation is informed by the surrounding blocks, the brand tokens already in use, and the document's tone. Same data-handling trust profile as comment-to-AI (D-03 — document content already transits the LLM during normal authoring).

**Pipeline: single, shared with receipt.** Generation produces a `.tsx` file in `generated-blocks/active/`. The file passes through the same lint + watchdog gate (ADR-0006) as a block received from a colleague. No parallel pipeline. The manifest header records "generated locally" (no sender email) until the consultant chooses to share, at which point the share flow stamps the sender field.

## Rejected alternatives

- **Chat-only.** Strong for back-and-forth refinement, weak at making the AI's misinterpretations visible — a buggy block looks fine in chat until you try to use it. Reconsidered as the *iteration* surface inside the hybrid.
- **Pure form.** Forces the consultant to specify the block in too much structured detail before they've seen what they want. High abandonment risk for non-developer users (R4: consultants never see YAML/JSON/code).
- **Standalone authoring view.** Decouples the block from the originating document; loses the brand-tokens / surrounding-blocks context that makes generation produce good output.
- **AI blind to document content.** Cheaper per call and avoids any extra data transiting the LLM, but produces noticeably weaker blocks. The trust profile is unchanged (comment-to-AI already sends document content), so the cost saving doesn't justify the quality loss.
- **Two pipelines (one for local generation, one for received blocks).** Doubles the surface area of the gate, and means a locally-generated block has different activation rules than the same block received from a colleague. Rejected.

## Consequences

- Preview iterations should not each fire a full receive-time lint — the preview lint is advisory (warnings only), the activation lint is binding (gates entry to the registry). Same lint code, different consequence.
- The preview renders inside the watchdog from the first frame, so the consultant sees the same failure modes a recipient will see. No "works in preview, breaks for Bob" gap.
- The "share" action stamps the sender field into the manifest header and may produce the file as an email attachment via OS share-sheet (Tauri capability TBD in M9 design). Pre-share, the block has no sender and uses a local-only type string variant (e.g., `local:competitive-matrix`) so its identity is stable across local edits but not yet shareable.
- Code generation is materially more expensive per call than comment-to-AI (D-11's cheap-default model is not suited for code gen). D-11 and D-34 amendments are prerequisites of this work — captured in the next ADRs.
- Generation requires the AI to see the document; the same prompt-caching strategy as D-13 (batched comment-to-AI) should apply to keep cost predictable during preview iteration.
