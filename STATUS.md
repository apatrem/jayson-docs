# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T12:30:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Progress since the previous fire

- ✅ **T-176 closed this fire** — Cost ledger — new `authored-block-generation` category (D-34 / ADR-0012).
  - `src/cost-ledger/db.ts` — Added `"authored-block-generation"` to `CostLedgerRowSchema` callKind enum; updated `migrateCostLedger()` with versioned migration (`user_version` pragma) that recreates the table to update the SQLite CHECK constraint on existing installs (rename-copy-drop dance inside a transaction), preserving old rows.
  - `tests/cost-ledger/authored-block-generation.test.ts` (NEW) — 6 tests: schema accepts new callKind, inserts/retrieves row, v1→v2 migration preserves old rows and accepts new category, idempotent double-migration, LLMClient logs authored-block-generation via codegen endpoint, D-32 content exclusion holds.

- ✅ T-175 closed last fire — LLM provisioning — `authored-block-generation` frontier-key category (ADR-0012).
- ✅ T-172 — Preview-first hybrid authoring UI (chat + structured fields, live preview).
- ✅ T-171 — "Create new Authored block" trigger + DocModel context threading.

## At a glance

Total tasks: 205   Done: 197 (96%)   Blocked: 0   Waiting: 4   Open: 1   Skipped: 1

## Next eligible tasks

**T-179** — Update `docs/BLOCK_IMPLEMENTATION_GUIDE.md` for `defineAuthoredBlock` (depends T-159 ✓).
**T-177** — Settings → My LLM Spend view: surface the authored-block-generation category (depends T-176 ✓).
**T-173** — Authored-block generation pipeline (depends T-172 ✓ + T-175 ✓).

## Recent commits

T-176: cost-ledger authored-block-generation category + schema migration
T-175: authored-block-generation frontier-key provisioning (ADR-0012)
T-172: preview-first hybrid authoring UI (ADR-0011)
T-171: in-document Create new Authored block trigger + DocModel context threading
T-170: replacement logic — same-sender v2 replaces v1 in-place (ADR-0009)

## CI status (origin/main)

Latest run: success (post-T-175 push)

Loop is running cleanly — no action needed.
