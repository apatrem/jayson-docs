# Authored blocks persist in the DocModel as `{sender}:{slug}`; the editor stays slug-keyed and the mapping reconciles the two

**Status:** accepted (concretises ADR-0009 at the DocModel/editor boundary; depends on ADR-0015)
**Date:** 2026-05-28

## Context

ADR-0009 binds an Authored block's DocModel `type` to `{sender-email}:{slug}` and explicitly rejected slug-only identity (cross-sender collisions). But the implemented stack is slug-only: `defineAuthoredBlock`'s `toPm`/`fromPm`, the editor TipTap node name, the `insertAuthored_<slug>` palette command, and `schemaName` all use the bare slug. As a result:

- `BlockSchema` is a closed discriminated union of the 15 Standard types, so a DocModel containing an authored block could not be parsed at all.
- `mapping.ts` knew only the Standard blocks, so loading a document with an authored block (or saving after inserting one) threw.

Making an installed Authored block usable end-to-end (insert → save → reload → render) requires reconciling the `{sender}:{slug}` persistence identity (ADR-0009) with the slug-keyed editor.

## Decision

**DocModel identity is `{sender}:{slug}` (ADR-0009 honored). The editor stays slug-keyed. The editor↔DocModel mapping translates between them using the installed manifest set.**

- **DocModel schema** — `DocBlockSchema` dispatches by `type`: a `{sender}:{slug}` string validates against `AuthoredDocBlockSchema` (a `BlockBaseSchema`-derived passthrough that structurally validates id/type/optional-note/optional-body and passes per-manifest attr fields through); everything else validates against the strict 15-type `BlockSchema`. Dispatch-by-type (not `z.union`) preserves each branch's native errors — a Standard block with a missing field still reports its precise discriminated-union diagnostic instead of a misleading "type invalid" from the authored branch — and the `.transform` re-parse preserves Standard blocks' defaults.
- **DocModel-layer validation is structural for authored blocks.** Per-manifest attr validation is not a parse-time concern; ADR-0013 guarantees the data can't execute.
- **Serialization** — `canonicalize` routes authored `{sender}:{slug}` types to an `AuthoredBlock` shape (`["id","type"]` prefix; dynamic attrs/note/body follow in object order) instead of throwing on an unknown block type.
- **Mapping** — `docModelToProseMirror`/`proseMirrorToDocModel` take the installed manifest set (default `[]`). DocModel→PM looks up by `fullType` and emits a node typed by the slug; PM→DocModel looks up by slug and restores the full `{sender}:{slug}` type. The sender is resolved at load time from the `.tsx` Manifest header (`loadAuthoredManifests` returns `InstalledAuthoredBlock { manifest, sender, fullType, folder }`).

## Rejected alternatives

- **Slug-only DocModel type.** Matches the shipped code with minimal change, but is the exact alternative ADR-0009 rejected (Alice's `competitive-matrix` clobbers Carol's) and would corrupt the canonical format "forever." Rejected.
- **Editor node keyed by the full `{sender}:{slug}`.** Removes the mapping translation, but TipTap node names / command names / CSS would carry `@` and `:`, and it would rework the just-landed slug-based command-name agreement. Rejected in favor of keeping the editor slug-keyed and translating at the boundary.
- **Open the union with `z.union([BlockSchema, AuthoredDocBlockSchema])`.** Simpler, but aggregates both branches' errors and degrades Standard-block diagnostics. Rejected for the type-dispatch above.

## Consequences

- **Two senders sharing a slug collapse to one entry** in the slug-keyed editor and the slug↔fullType mapping (the loader dedupes by slug, active winning). This single-sender-per-slug limitation already exists in the slug-keyed palette (`authored:{slug}` ids, `insertAuthored_{slug}` commands); full cross-sender coexistence in a single document is **deferred**.
- **A permanently-deleted authored block** referenced by a document is not in the installed set, so the mapping can't resolve it; `documentToEditorContent` returns null and `DocumentView` shows "Loading…" rather than crashing. An editor-side removed-block placeholder (mirroring the renderer's `RemovedBlockPlaceholder`) is **deferred**.
- The exported `Block` type stays the strict 15-type union; `DocBlock = Block | AuthoredDocBlock` is the document-stored shape. `mapping.ts`'s former `assertNever` exhaustiveness guard is replaced by registry-lookup-or-`MappingError`.
