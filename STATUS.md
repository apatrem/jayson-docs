# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T13:00:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Progress since the previous fire

- ✅ **T-173 closed this fire** — Authored-block generation pipeline (LLM call + shared receive pipeline) (ADR-0011 / ADR-0012).
  - `src/llm/generate-authored-block.ts` (NEW) — `buildGenerateAuthoredBlockRequest()` and `buildRefineAuthoredBlockRequest()` build LLMRequests with: system prompt, three cached context blocks (schemaContext describing `AuthoredBlockManifest` + RenderNode types; brandTokensContext; docContext extracting client/project/block-types-in-use from the DocumentModel). Refinement reuses same cached contexts (D-13 cache hit); only new instruction is added as message, not the full initial prompt. callKind: `authored-block-generation`, modelKind: `codegen`.
  - `src/ui/views/DocumentView.tsx` (UPDATED) — Wires `callLlm` + `lintForPreview` injectable props; holds `generating`, `previewNode`, and `generationHistory` state. On `onGenerate`: calls `buildGenerateAuthoredBlockRequest` (first call) or `buildRefineAuthoredBlockRequest` (subsequent), appends turns to history, runs advisory lint, if passes builds `buildAuthoredRenderer(manifest)` and sets `previewNode`. On close, resets all generation state.
  - `tests/llm-generate-authored-block.test.ts` (NEW) — 19 tests covering: request structure, callKind, cached contexts, docContext content, refinement conversation history, D-13 non-duplication of initial prompt, cost field with/without docId.

- ✅ T-176 closed last fire — Cost ledger — new `authored-block-generation` category.
- ✅ T-175 — LLM provisioning — `authored-block-generation` frontier-key category.
- ✅ T-172 — Preview-first hybrid authoring UI.

## At a glance

Total tasks: 205   Done: 198 (97%)   Blocked: 0   Waiting: 4   Open: 1   Skipped: 1

## Next eligible tasks

**T-174** — Share flow (sender stamp + OS share-sheet attachment) (depends T-173 ✓).
**T-177** — Settings → My LLM Spend view: surface authored-block-generation (depends T-176 ✓).
**T-179** — Update `docs/BLOCK_IMPLEMENTATION_GUIDE.md` for `defineAuthoredBlock` (depends T-159 ✓).

## Recent commits

T-173: authored-block generation pipeline (ADR-0011 / ADR-0012)
T-176: cost-ledger authored-block-generation category + schema migration
T-175: authored-block-generation frontier-key provisioning (ADR-0012)
T-172: preview-first hybrid authoring UI (ADR-0011)
T-171: in-document Create new Authored block trigger + DocModel context threading

## CI status (origin/main)

Latest run: success (post-T-176 push)

Loop is running cleanly — no action needed.
