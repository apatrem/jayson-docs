<!--
  firm.md — the manifest at the root of your Firm context.

  The Setup skill drafts this for you from your materials; you then edit it.
  Every deliverable skill reads this file to know who you are, what you do, and
  — critically — which folders it may quote from vs must anonymise (the Trust map).

  Replace every {{placeholder}}. Keep it accurate; the deliverables are only as
  good as this file.
-->

# {{Firm name}} — Firm context

## Identity

- **Name:** {{Firm name}}
- **Founded:** {{year}}
- **Website:** {{url}}
- **Mission / positioning:** {{one or two sentences — what makes the firm distinctive}}
- **Languages:** {{e.g. FR, EN}}

## Expertise

List the firm's core areas of expertise (the deliverable skills use these to
ground content and pick relevant references).

- **{{Area 1}}** — {{one line}}
- **{{Area 2}}** — {{one line}}
- **{{Area 3}}** — {{one line}}

## People

The team and advisors who may be named in deliverables. The canonical
machine-readable source is **`people/roster.json`** (with `photo` paths); this
table is a human-readable summary.

| Name | Role | Background |
|------|------|------------|
| {{Name}} | {{role}} | {{ex-X, ex-Y}} |

## Brand

> Resolved at Setup from your actual template — **the template is canonical**.
> If your stated brand and your template disagreed, Setup surfaced it and these
> are the confirmed values (Brand reconciliation).

- **Primary colour:** {{#RRGGBB}}
- **Heading font:** {{font}}
- **Body font:** {{font}}
- **Logo:** {{path in brand/}}

## Trust map  ⚠️ load-bearing

Each folder of this Firm context carries a **Trust tier** that the deliverable
skills **enforce** — this is what stops a confidential client name from leaking
into a new deliverable. Do not loosen a tier without thinking.

| Folder | Trust tier | What skills may do |
|--------|-----------|--------------------|
| `brand/` | **brand-source** | Consumed by Setup (template, logo, fonts). Never quoted as content. |
| `people/` | **internal-citable** | Your own team & advisors — cite by name in team slides. |
| `public/` | **public** | Marketing, white papers, named public references — **quote freely**. |
| `confidential/` | **confidential** | Past proposals & deliverables — **structure / methodology only; anonymise all client names** (e.g. "a European utility"). |

## Confidentiality rules

- Never output a client name found under `confidential/` unless it is *also* a
  named public reference listed under `public/`.
- When in doubt about a reference, anonymise (sector + geography + year).
