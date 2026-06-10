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
- mode: low             # low (default) | medium | hard — effort/review dial (ADR-0004); prefer low, justify higher
                        #   low    = 1 implementer + gate + 1 adversarial reviewer (Fable 5 @ medium)
                        #   medium = + independent dual review on the PR (GPT-5.5 xhigh + Fable 5 high → synthesis)
                        #   hard   = competitive best-of-N + smart-merge (Fable 5 @ xhigh), THEN the medium dual review (hard ⊇ medium)
- size budget: < 300 changed lines (split or stack if larger)
