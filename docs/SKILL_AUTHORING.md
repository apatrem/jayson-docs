# Skill Authoring

How skills work, the **Standard opener** every skill inherits, and how the
**skill creator** generates new **Custom skills**. Decisions of record: **D15**
(skills are LLM-agnostic markdown, BYO LLM), **D18** (skill creator, Custom-skill
tier, transport). Glossary: `CONTEXT.md` → *Skill, Custom skill, Skill package,
Standard opener*.

---

## 1. What a skill is

A **markdown playbook** that instructs an agentic LLM to turn a request into a
deliverable. It **composes the frozen closed library** — it never mints layouts,
blocks, or brand (those are Setup, D13). A skill is followable by *any* agentic
LLM; the app it calls contains no LLM (D11).

**Two tiers**:

- **Built-in skills** — the four shipped in the pack (`commercial-proposal-*`,
  `report-*`).
- **Custom skills** — generated on demand by the skill creator, stored in the
  firm's **Install**.

## 2. Anatomy of a skill (`SKILL.md`)

1. **Frontmatter** — `name`, `description` with trigger phrases + "do not trigger
   for" disambiguation.
2. **Hard rules** — never lay out / pick coordinates / choose brand; only pick a
   `layoutId` from the catalogue and fill typed slots; honour density caps;
   never invent chart kinds/layouts; surface validation errors verbatim.
3. **Read first** — `SLIDE_LAYOUT_LIBRARY.md` (the layout spec), `CHART_CATALOGUE.md`, the schema, the
   brand.
4. **Workflow** — **A.** ask the Standard opener (§3) + skill-specific
   follow-ups → **B.** produce a schema-valid Fill-plan (`kind`, sections,
   slides/blocks picked from the catalogue) → **C.** write it to a
   project-relative temp file (or pipe `--plan -`) → **D.** invoke the app *or*
   hand the fill-plan to the human → **E.** surface the output path.
5. **Failure modes** — master missing, schema validation failure, unknown chart
   kind, density cap exceeded.

## 3. The Standard opener  ⭐ (lives here)

Every skill opens with this shared block, **one short question at a time**. It is
a **modifiable default** (a direction, not a gate): the skill creator seeds it
into each new Custom skill, and the author may cut / reorder / add. Rows 1–5 are
core; 6–7 are conditional follow-ups.

| # | Question (conversational) | Why |
|---|---|---|
| 1 | **Language** — "French or English?" | the firm works FR/EN per client |
| 2 | **Client / recipient** — "Who's it for? May I name them, or anonymise (e.g. 'a European utility')?" | addressing **+ confidentiality** |
| 3 | **Context** — "In 2–3 sentences: the situation, the stakes, any constraints." | grounds the deliverable |
| 4 | **Objective** — "One sentence: what should this achieve / what decision does it support?" | an action-titled goal focuses every section |
| 5 | **Audience** — "Who reads/hears it — CEO, ExCom, operating team?" | drives tone, depth, length |
| 6 | **Timeline** *(if appropriate)* — "Any deadline, duration, or milestones to reflect?" | proposals/plans need it; skip for a memo |
| 7 | **Key data** *(if appropriate)* — "Any specific numbers, charts, or sources? Share the real figures." | charts/KPIs need real data, never invented |

Then the skill adds its own follow-ups (a proposal asks fees & team; a report asks
the headline finding). **The prompting sequence is first-class** — much of a
deliverable's quality comes from asking the right questions in the right order.

Guidance: ask only what's genuinely needed; if the consultant volunteers a long
brief, parse it and ask only for the gaps.

## 4. The skill creator

A meta-skill (in the pack) that generates a new **Custom skill** from a
description of a deliverable type. It:

1. Drafts the `SKILL.md` (frontmatter, hard rules, read-first, workflow) with the
   **Standard opener** pre-filled (editable) plus proposed skill-specific
   follow-ups and a default standard structure (a sequence of sections + suggested
   layouts from `SLIDE_LAYOUT_LIBRARY.md`).
2. **Stays inside the closed library** — references only existing layouts /
   block-types / trust tiers / the fill-plan schema. **If the deliverable needs a
   layout that doesn't exist, it routes to Setup** (D13, the only minting path) —
   it never invents one.
3. **Validates** — generates a sample fill-plan from the new skill and asserts it
   **passes Zod**.
4. **Human-gates** — a person reviews and approves before the skill joins the
   Install.

## 5. Sharing a Custom skill

A consultant emails a **self-contained Skill package** to a **same-company**
colleague (D18):

- Contents: the `SKILL.md` + its initial-question set + a manifest (sender,
  provenance, version), **bundling any User-layout dependencies** (as Layout
  packages) so a single file just works.
- On receipt, a **gate** vets each bundled layout (`shapes ≡ slots`, brand fit)
  and installs the skill — or **quarantines** with a reason.
- **Within-company only** — same brand/master, so Built-in and Company-approved
  references already resolve. Cross-company waits for the brand-theme split.
