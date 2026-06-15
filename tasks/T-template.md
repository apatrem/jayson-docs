# T-000: <title>

<!-- Output of Phase 2 (/agentic-workflow:plan). One unit of work, small enough to review. -->

## Objective
<what + why, one short paragraph — no implementation prescription>

## Acceptance criteria  (must be machine-checkable)
- [ ] <criterion> → covered by `tests/<file>`
- [ ] gate green: `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`

## Files likely involved
- <path>

## Out of scope
- <explicit non-goals>

## Risks / do-not-touch
- <protected contract this task must not change>

## Meta
- mode: low             # low (default) | medium | hard — effort/review dial (AW-0004); prefer low, justify higher
                        #   low    = 1 implementer + gate + 1 adversarial reviewer
                        #   medium = + independent cross-lineage dual review on the PR → synthesis
                        #   hard   = best-of-N over 2 lineages + smart-merge, THEN the dual review w/ ≥1 structurally-clean lens (hard ⊇ medium)
                        #   (which model runs each role/tier: docs/MODELS.md)
                        #   note: mode is a FLOOR — protected/destructive surface forces ≥ medium (AW-0004)
- size budget: < 300 changed lines (split or stack if larger)
