# Firm context — reserved structure

This folder is the **Firm context**: everything jayson-docs needs to know about
*your firm* to draft on-brand deliverables. It lives on your machine (never
uploaded); the Setup skill scaffolds it and you populate it over time.

## Two principles for what you put here

**1. Prefer LLM-readable text.** Claude reads this folder constantly, so favour
formats that are cheap to read and easy to parse:

- **Markdown (`.md`)** for prose — bios, positioning, case studies, methodology.
- **JSON** for structured data — people rosters, rate cards, reference lists.

Raw `.pdf` / `.pptx` / `.docx` originals are fine to keep as the source of truth,
but add a markdown/JSON **derivative** for anything read often — it is far cheaper
in tokens than re-parsing a binary on every run, and far more reliable. (A future
ingestion step can auto-convert raw → markdown; see `docs/SETUP_PIPELINE.md`.)

**2. Reference assets by path — don't embed them.** Keep binary assets (logos,
team photos, diagrams) as files and **point to them by relative path** from your
markdown/JSON — e.g. a person's record has `"photo": "people/photos/j-doe.jpg"`,
and `firm.md` brand has `logo: brand/logo.svg`. This keeps the text light and the
assets reusable across every deliverable.

## Layout

| Path | Trust tier | Prefer |
|------|-----------|--------|
| `firm.md` | — | the manifest (markdown) |
| `brand/` | brand-source | template files + `logo.svg`; brand *values* live as text in `firm.md` |
| `people/` | internal-citable | `roster.json` + `bios/*.md`; photos in `people/photos/` |
| `public/` | public | `.md` derivatives of decks / white papers (keep originals too) |
| `confidential/` | confidential | `.md` methodology derivatives; heavy originals referenced by path |

Each folder's own `README.md` explains its Trust tier and how the skills use it.
