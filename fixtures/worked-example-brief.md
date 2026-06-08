# Worked example — report-pptx (kpi-row-chart)

Representative consultant brief and the fill-plan it produces. Use this to verify
the human-run CLI path and as a reference when authoring fill-plans via BYO LLM.

## Brief (what the consultant supplies)

| Field | Value |
|---|---|
| Client | Transitional Energy Group (TEG) |
| Meeting type | Steering committee — Module 1 readout |
| Date | 2026-06-04 |
| Audience | TEG leadership + Acme project team |
| Headline finding | Tier-1 candidates score 2x ammonia on bankable long-term demand |
| KPI strip | 2.4x demand vs ammonia (+140%); EUR 68/MWh LCOE target (−12%); 7 credible offtakers |
| Chart data | 2032 demand scenarios (TWh) — four industries × three scenarios (low / base / high) |
| Narrative bullets | Three industries clear the bankability gate in all scenarios; ammonia trails on counterparty diversity, not on LCOE; final selection in Module 2 |

### Chart dataset (for `datasets.tier1_demand_2032`)

| industry | low | base | high |
|---|---:|---:|---:|
| Industry A | 120 | 240 | 380 |
| Industry B | 90 | 200 | 310 |
| Industry C | 60 | 140 | 260 |
| Ammonia (baseline) | 50 | 100 | 170 |

## Fill-plan (schema-valid JSON)

The brief above maps to `fixtures/valid-fill-plan.json`. Key constraints:

- `meta.templateId` = `"report.master.pptx"` (logical template id — even when the
  on-disk file is `PLACEHOLDER-report.master.pptx` during development).
- One section, one slide with `layoutId: "kpi-row-chart"`.
- `chart.kind` must be `"stacked-bar"` (pinned by the layout — not user-selectable).
- Chart data via `chart.datasetRef: "tier1_demand_2032"` resolving to `datasets`.

## Human-run CLI (prove end-to-end)

From the repo root, with dependencies installed:

```bash
npm run fill -- fill \
  --template templates/PLACEHOLDER-report.master.pptx \
  --plan fixtures/valid-fill-plan.json \
  --out out/teg-steering-deck.pptx
```

When Acme provides the real master, swap the template path to
`templates/report.master.pptx` — the fill-plan stays the same.

Expected result: a `.pptx` that opens in PowerPoint with the action title, three KPI
cards, bullet narrative, and a native editable stacked-bar chart carrying the
dataset values from the fill-plan.
