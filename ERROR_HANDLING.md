# Error Handling Policy

Single rule: **fail loudly, fail fast, name the cause.** Never silently "fix" an error by truncating, inventing a value, or substituting a default. The architecture's consistency guarantee depends on errors surfacing rather than being papered over.

---

## Error classes & required behaviour

### `llm` — LLM output fails schema validation

- **What:** the LLM returned JSON that does not parse, or parses but fails `fillPlanSchema.parse(...)`.
- **Do:** abort the run; throw an error whose message **names the failing path** (e.g. `sections[1].slides[0]['kpi-strip'][0].figure: expected string, got null`) and **includes the raw LLM output** for debugging.
- **Do not:** retry silently. Do not auto-truncate over-long fields. Do not substitute defaults.
- **Optional:** a single bounded retry with a "you violated this constraint, fix it" instruction added to the user prompt — at most once. Then fail.

### `master` — master `.pptx` missing or unreadable

- **What:** the `--template` path does not exist, is not a `.pptx`, or pptx-automizer cannot load it.
- **Do:** abort with a clear path + reason. If the master is missing a named shape the schema requires, list every missing shape name.

### `shape-name` — named shape referenced by schema is missing in master

- **What:** the layout schema expects e.g. `slot.kpi-strip.card1.figure`, but the master template's chosen slide doesn't contain that shape.
- **Do:** abort with the missing shape name and the layout it belongs to. Do not fall back to placing a text box somewhere arbitrary.

### `chart-data` — chart dataset doesn't match the chart kind's contract

- **What:** dataset row arity ≠ column count; pie chart has >8 rows; waterfall row has invalid `kind`.
- **Do:** abort with the chart-block path and the constraint violated. See `CHART_CATALOGUE.md` for the per-kind contract.

### `save` — file write fails

- **What:** output path is unwritable, disk full, permission denied.
- **Do:** abort with the OS error unchanged. Do not try alternate paths.

### `env` — required environment variable missing

- **What:** v1 requires **no** environment variables — there is no LLM call and no API key (DECISIONS_LOG D11). Reserved for a future standalone (non-Cowork) path that would need `ANTHROPIC_API_KEY`.
- **Do:** if such a path is ever added, abort with a message pointing at `.env.example`.

---

## Exit codes (CLI)

- `0` — success.
- `1` — unexpected runtime error.
- `2` — user-facing validation error (`llm`, `master`, `shape-name`, `chart-data`).
- `3` — environment error (`env`).
- `4` — I/O error (`save`).

---

## What never happens

- The LLM's output is never written to disk before schema validation passes.
- The pipeline never produces a partial `.pptx` (the save step is the last step and is atomic from the consultant's view — either the file is written cleanly or it is not written at all).
- A failing validation never produces output with a "best effort" filling-in.
- A missing named shape in the master is never silently skipped.

These are the four guarantees that hold the consistency contract. Every error path in the code should preserve them; if you find yourself writing logic that could violate one, stop and re-read this file.
