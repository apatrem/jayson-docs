# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T13:58:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-131** — Library "Create from Template" surface (3h).
- Depends-on: T-128 ✓, T-130 ✓.

## Progress since the previous fire

- ✅ **T-130 closed this fire** — Create 4 standard document templates:
  - **`templates/commercial-proposal.yaml`** (NEW) — kind: document; 8 sections: cover,
    executive summary, client situation, proposed approach, deliverables+timeline, team,
    pricing, appendix. Uses heading, prose, kpi-cards, callout, bullet-list, timeline, team,
    table, divider. All `[REPLACE:…]` markers in place.
  - **`templates/commercial-proposal-deck.yaml`** (NEW) — kind: deck; 10 slides: cover,
    agenda, situation, approach, deliverables, timeline, team, pricing, next steps, closing.
  - **`templates/standard-report.yaml`** (NEW) — kind: document; 8 sections: cover,
    executive summary, methodology, findings (with chart), recommendations, risk matrix,
    next steps, appendix.
  - **`templates/standard-report-deck.yaml`** (NEW) — kind: deck; 10 slides: cover, agenda,
    executive summary (KPIs), methodology, 3 × finding slides, recommendations, risks, closing.
  - **`tests/templates/template-validity.test.ts`** (NEW) — 12 tests (3 per template):
    parses via DocModelSchema, uses only standard block types, contains [REPLACE: marker.
  - All gates green: tsc ✓, lint ✓, 564/564 tests pass.

- ✅ **T-129 closed previous fire** — Library view filters + sort + search.
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 206   Done: 151 (73%)   Blocked: 0   Waiting: 2   Open: 52   Skipped: 1

## Recent commits

(pending this fire's commit)
T-129: library view filters + sort + search
T-128: library view scaffold + folder scan + empty-state "Use Sample"

## CI status (origin/main)

latest completed run on `main`: success (pre-T-130 push)

Loop is running cleanly — T-131 is next.
