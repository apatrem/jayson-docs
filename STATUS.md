# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T12:00:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Progress since the previous fire

- ✅ **T-175 closed this fire** — LLM provisioning — `authored-block-generation` frontier-key category (ADR-0012).
  - `src/schema/install-config.ts` — `codegenModel: EndpointSchema` added alongside fast/thinking.
  - `src/llm/client.ts` — `ModelKind` extended to `"fast" | "thinking" | "codegen"`; `AppConfigLlm.llm.codegenModel` added; `call()` dispatch handles codegen.
  - `src/setup/install.ts` — `validateCodegenKey()` + `verifyCodegenEndpoint()` added; `resolveSecrets()` returns `{fast, thinking, codegen}`; `makeConfig()` wires `codegenModel` to `llm.codegen.api-key`; `writeSecret("llm.codegen.api-key", ...)` called; summary always emitted (non-interactive too) showing codegen model + "authored-block-generation" label.
  - `tests/setup/install-codegen.test.ts` (NEW) — 6 tests: stores codegen key, defaults to THINKING_API_KEY, accepts CODEGEN_API_KEY override, fails on missing key, fails on bad format, shows codegen in summary.
  - Scope expansion (same subsystem): `tests/llm-client.test.ts`, `tests/llm-client-cost-ledger.test.ts`, `tests/cost-ledger-no-content.test.ts` — added `codegenModel` to config helpers.

- ✅ T-172 closed last fire — Preview-first hybrid authoring UI (chat + structured fields, live preview).
- ✅ T-171 — "Create new Authored block" trigger + DocModel context threading.
- ✅ T-170 — Replacement logic (same-sender v2 replaces v1 in-place).

## At a glance

Total tasks: 205   Done: 196 (96%)   Blocked: 0   Waiting: 4   Open: 2   Skipped: 1

## Next eligible tasks

**T-179** — Update `docs/BLOCK_IMPLEMENTATION_GUIDE.md` for `defineAuthoredBlock` (depends T-159 ✓).
**T-176** — Cost ledger — new `authored-block-generation` category (depends T-175 ✓).
**T-173** — Authored-block generation pipeline (depends T-172 ✓ + T-175 ✓).

## Recent commits

T-175: authored-block-generation frontier-key provisioning + install validation
T-172: preview-first hybrid authoring UI (chat + structured fields, live preview)
T-171: in-document Create new Authored block trigger + DocModel context threading
T-170: replacement logic — same-sender v2 replaces v1 in-place (ADR-0009)
T-169: BlockPalette filter + Authored-block manager view

## CI status (origin/main)

Latest run: success (post-T-172 push)

Loop is running cleanly — no action needed.
