# brand/ — Trust tier: **brand-source**

Drop here the materials that define how your deliverables *look*:

- Your master PowerPoint and Word **templates** (`.pptx`, `.docx`).
- Your **logo** (ideally `.svg` or high-res `.png`) — **referenced by path** from
  `firm.md` (`logo: brand/logo.svg`), not pasted into text.
- Any **brand / style guide** you have (used at Setup to cross-check the template).

The resolved brand **values** (colours, fonts) live as text in `firm.md`, not
re-derived from the binary each run.

**How this folder is used:** the **Setup** skill reads these once to derive your
brand (colours, fonts, logo) and to propose your closed layout library. If your
style guide and your template disagree, Setup surfaces the conflict and the
**template wins** (Brand reconciliation).

**What skills never do:** quote anything here as document *content*. This folder
feeds the look, not the words.
