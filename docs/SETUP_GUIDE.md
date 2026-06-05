# Setting up jayson-docs — a guide for non-programmers

> **Status: post-v1 (D20).** Setup is designed but **not implemented in v1** (v1 is the report-pptx skeleton) — this describes the planned onboarding.
>
> **Confidentiality — read this:** the *app* runs locally and uploads nothing. But the *AI assistant* you choose (Cowork, ChatGPT, Cursor, …) reads what you give it; if it is a **hosted** assistant, that content goes to its provider under their data policy. Trust tiers are **instructions to the assistant, not technical controls** — for strict confidentiality use a local model or keep sensitive material out of the assistant's view.

This guide gets your firm from "nothing installed" to "generating on-brand
proposals and reports" in three steps. No coding, no command line. Allow about
**30–45 minutes**, most of which is you reviewing what the app proposes.

> **What the app does, in one sentence:** you describe a deliverable in a chat,
> and the app fills *your own* PowerPoint/Word template with the content — so
> every document comes out on-brand, automatically.

---

## Before you start — what you'll need

- A computer running **macOS or Windows**.
- A **Claude / Cowork** subscription (this is the "brain" that drafts content —
  the app itself never sends your files anywhere).
- Your firm's **PowerPoint and Word templates** (the branded ones you already use).
- **3–5 example decks/documents** you're proud of (the app learns your layouts
  from these).
- Your firm's basic info: name, what you do, key people.

Everything stays **on your computer**. Your confidential client work is never
uploaded.

---

## Step 1 — Get the pack

1. Download the **jayson-docs pack for your computer** from the download page:
   - **macOS:** `jayson-docs-mac.zip`
   - **Windows:** `jayson-docs-win.zip`

   The pack is a small folder of instructions with the jayson-docs program
   already **inside it** — there's nothing to install and nothing for you to open.
2. Unzip it somewhere you'll remember (e.g. your Documents folder).
3. Point your AI assistant at the folder — whichever you use:
   - **Claude Cowork, Claude Code, or Cursor** (recommended, especially for setup):
     tell it to read the pack folder and follow it.
   - **A plain chat (e.g. ChatGPT):** you can still make documents, but the one-time
     *firm setup* below needs an assistant that can read your files.

   Your assistant runs the program **for** you, from inside the pack — you never
   launch it yourself.

   *(If your firm is on Cowork, there's also an optional one-click plugin — the
   same skills, easier to install.)*

## Step 2 — Set up your firm (you only do this once)

This is where your assistant learns *your* brand, *your* layouts, and *your*
background — so every later document sounds and looks like your firm.

1. Tell your assistant: **"set up my firm."**
2. When asked, point it at:
   - your **template** files (from "what you'll need"),
   - your **3–5 example** decks/documents, and
   - your **background material** (company presentations, white papers, team
     bios, past proposals).
3. Your assistant then:
   - **proposes your brand** (colours, fonts, logo) and a tidy set of **slide
     layouts** it found you using repeatedly; and
   - **reads your background material** and writes a small **firm folder** of
     plain-text summaries it can reuse, organised into four labelled drawers:
     `brand/` · `people/` · `public/` · `confidential/`.
4. **Review what it proposes.** For brand, it will say, e.g.:
   > "Your brand document says green `#1BB071`, but your template uses `#00C259`
   > — I'll use the template. OK?"
   Confirm or correct each point. Nothing is locked in until you approve.
5. **Approve.** Your setup is now **frozen** — from here on, every deliverable
   uses exactly these layouts, this brand, and this firm folder.

Each drawer has a short note on what goes in it and how it's treated — for
example, anything in `confidential/` is used for *style and method only*, and
client names are always hidden. The **app** never uploads your files — though a *hosted* assistant still reads what you point it at (see the confidentiality note at the top).

> **Heads-up:** this one-time setup *reads your documents*, so it needs an
> assistant that can open files (Claude Cowork, Claude Code, Cursor). Day-to-day
> document-making (Step 3) works with a plain chat too.

## Step 3 — Make your first deliverable

1. Tell your assistant what you need, e.g. **"draft a proposal deck for [prospect]."**
2. Answer a few short questions (client, goal, key numbers).
3. Your assistant drafts the content and the app produces a finished
   **PowerPoint or Word file**, on-brand, and tells you where it saved it.
4. Open it in PowerPoint/Word and finish it the way you always do.

That's it. Repeat Step 3 whenever you need a deliverable; Steps 1–2 are one-time.

---

## What happens to your files (the short version)

- Your templates and client documents **stay on your computer**.
- Cowork is used only to **draft the words** — it never receives your
  confidential folder.
- The app fills your template **mechanically**; it never invents your brand or
  re-styles your slides.

## If something looks off

- **"App can't be opened" (macOS) / "Windows protected your PC":** your assistant
  runs the jayson-docs program for you, and a properly signed pack won't trigger
  this. If it does appear, follow your IT team's guidance for approving an
  internal program, or contact whoever sent you the download.
- **A layout looks wrong:** re-run "set up my firm" and adjust the proposed
  layouts — setup can be redone any time.
- **The app refuses a document:** it's protecting your layout (e.g. too much text
  for a slide). Shorten the content, or split it across two slides, and retry.
