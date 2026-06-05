# people/ — Trust tier: **internal-citable**

Profiles of your own team and advisor network — the people who may appear in a
deliverable's team slide or be cited as project leads.

Drop here, **preferring structured / text formats**:

- **`roster.json`** — the canonical structured list (each entry: name, role,
  background, sector, and a `photo` path). The team-slide layout reads this
  directly. Example entry:
  ```json
  { "name": "Jane Doe", "role": "Partner, Energy", "background": "ex-McKinsey",
    "sector": "energy", "photo": "people/photos/jane-doe.jpg" }
  ```
- **`bios/*.md`** — longer markdown bios for people who need them.
- **`photos/`** — team & advisor pictures (`.jpg` / `.png`), **referenced by path**
  from `roster.json`, never embedded.

Keep CVs as `.pdf` if you have them, but add the `roster.json` entry — skills read
the JSON, not the PDF.

**How this folder is used:** deliverable skills may **cite these people by name**
(they are your own staff and advisors, not a client). The team-slide and
proposed-team sections draw from here.

**What skills never do:** invent people, titles, or credentials. If a profile is
missing, the skill asks you rather than guessing.
