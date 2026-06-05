# templates/

Drop the Acme master `.pptx` here, named **`proposal.master.pptx`**.

The master defines:

- The Acme brand (colours, fonts, logo, spacing) — must match `src/brand/brand.yaml`.
- The closed library of slide layouts per `docs/SLIDE_LAYOUT_LIBRARY.md`.
- Named shapes on each layout slide following the convention in that document (`slot.<slotName>.<subElement>`).

Until you have the real master, the implementing agent may author a placeholder via PptxGenJS with the prefix `PLACEHOLDER-` in the filename. M2 acceptance requires the real master in place.
