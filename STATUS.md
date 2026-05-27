# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T16:05:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-141b** — Make `mapping.ts` registry-aware (hybrid) (depends on T-141 ✓).
Also eligible: **T-141c** (bridge M8 generated-blocks loader, depends on T-141 ✓, T-132 ✓).

## Progress since the previous fire

- ✅ **T-141a closed this fire** — Example brand theme + structural HTML snapshot baselines:
  - **`brand.example.yaml`** (UPDATED) — professional-consulting-style theme. Headings: Georgia
    22 (scale h1–h4). Body: Arial 12. Primary: deep navy `#001A70`, secondary `#2F6FBE`, tertiary
    `#6EA8D8`. Neutral grey scale. Chart qualitative palette: 8 blue-family colors; sequential:
    5-stop dark-to-light ramp. Identity: "Corporate Consulting Example" (naming constraint met).
    Headshots restored with keys matching `sample-proposal.yaml` (`jane-smith`, `pierre-dubois`,
    `marie-chen`).
  - **`tests/renderer/<name>.snapshot.test.ts`** × 15 (NEW) — Vitest structural HTML snapshot
    for each Standard block rendered under the new brand tokens:
    `bullet-list`, `callout`, `chart`, `diagram`, `divider`, `heading`, `image`,
    `kpi-cards`, `numbered-list`, `prose`, `risk-matrix`, `roadmap`, `table`, `team`, `timeline`.
    All 15 pass (29 test cases total, including orientation variants for Divider and Timeline).
  - **Scope expansion (tests updated to track new brand values):**
    - `tests/renderer/document-renderer.test.tsx` — `#0B3D91` → `#001A70` (new primary).
    - `tests/brand-tokens/resolve.test.ts` — expected colors updated to `#001A70` / `#1B2130`.
    - `tests/brand/defaultBrand.test.ts` — identity.name updated to "Corporate Consulting Example".
    - `tests/brand-tokens/brand-provider.test.tsx` — identity.name updated.
    - `tests/primitives/block-primitives.test.tsx` — surface/border colors updated to `#F7F8FA` / `#D9DBE0`.
  - Gates: tsc ✓, lint ✓, all tests pass.

- ✅ **T-141 closed previous fire** — Folder layout scaffolding (legacy-wrapper approach).
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 205   Done: 161 (79%)   Blocked: 0   Waiting: 2   Open: 41   Skipped: 1

## Recent commits

(pending this fire's commit)
T-141: folder layout scaffolding (legacy-wrapper approach, 15 blocks)
T-138: reference pattern refresh (new defineBlock shape + deprecate mapping/)
T-140: registry loaders (schema + runtime, both static for M9a)
T-139: registry API + per-block schema/runtime module split

## CI status (origin/main)

Latest completed run on `main`: success (post-T-141 push)

T-141a done; T-141b (mapping.ts registry-aware hybrid) is next eligible.
