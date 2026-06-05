# skills/ — Acme jayson-docs skills pack

Four **markdown skills** drive this app with **any** agentic LLM (BYO LLM — Cowork, Claude Code, Cursor, …). Each one tells the LLM how to:

1. recognise the trigger (the consultant asks for that deliverable type),
2. gather the brief from the consultant (one short question at a time),
3. produce a schema-valid fill-plan JSON in context,
4. write the JSON to a temp file,
5. invoke the app — or hand the fill-plan to the human to run — to produce the final `.pptx` or `.docx`,
6. surface the output path back to the consultant.

| Skill | Output format | Use case |
|---|---|---|
| `commercial-proposal-pptx` | `.pptx` | sales pitch deck for winning a mandate |
| `commercial-proposal-docx` | `.docx` | written proposal (document form of the pitch) |
| `report-pptx` | `.pptx` | delivery / steering-committee presentation |
| `report-docx` | `.docx` | written report / executive memo |

Each skill points at a specific master template under `templates/` and shares the schemas under `src/schema/`, the chart catalogue in `CHART_CATALOGUE.md`, and the layout library in `docs/SLIDE_LAYOUT_LIBRARY.md`.

## Delivery (BYO LLM; Cowork plugin optional)

The product is this **portable skills folder + the app**, driven by the user's own agentic LLM (D15). A **Cowork plugin is one optional packaging** — to publish it, verify the manifest and SKILL.md frontmatter against the current Cowork plugin spec using the `cowork-plugin-management:create-cowork-plugin` skill.

## Cross-platform

Skills write the fill-plan to a **project-relative** temp path (e.g.
`tmp/jayson-docs-fillplan-<timestamp>.json`), **never `/tmp`** — relative paths
resolve identically on macOS and Windows. The CLI also accepts `--plan -` to read
the fill-plan from **stdin**, avoiding a temp file altogether.

## Hard rules (mirror `AGENTS.md` §5)

- The skill never calls an LLM via an API; the LLM is the **user's own** (BYO LLM, D15) — the app calls none.
- The skill never lays anything out, picks coordinates, or chooses brand values — only fills typed slots from a closed library.
- The skill never auto-fixes a fill-plan that fails validation; it surfaces the validation error to the consultant.
- The skill never invents slot names, chart kinds, or layouts not in the schema.
