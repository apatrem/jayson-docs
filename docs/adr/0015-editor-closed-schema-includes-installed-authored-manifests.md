# The editor's closed schema = static blocks ∪ the installed authored manifest set

**Status:** accepted (builds on ADR-0013 and ADR-0007; makes installed Authored blocks insertable and renderable in the editor)
**Date:** 2026-05-28

## Context

The editor registers a **closed schema** — an exact set of TipTap node and mark types, asserted by `tests/editor/closed-schema.test.ts` to equal `ALLOWED_EDITOR_NODE_NAMES` and nothing else. This was a static constant derived only from the 15 Standard blocks. `assertClosedEditorContent` validates document JSON against the same set.

Authored blocks (Tier 3) are installed on disk under `generated-blocks/active/` and `archived/` as `.tsx` files plus extracted-manifest sidecars (ADR-0013). Their TipTap nodes were never registered, so the palette buttons stayed disabled (`editor.commands.insertAuthored_<slug>` was `undefined`) and an installed Authored block could be neither inserted nor rendered in the editor.

The question is whether the closed schema — a security boundary — may widen based on runtime filesystem contents.

## Decision

The editor's closed schema is **static block types ∪ the installed manifest set**, where the *installed manifest set* is the extracted `AuthoredBlockManifest`s under `generated-blocks/active/` ∪ `archived/` (the two folders whose contents passed the receive-time gate). Concretely:

- `createEditorExtensions(authoredManifests)` appends `buildAuthoredTipTapNode(manifest)` for each installed manifest. The empty default reproduces the prior static-only behavior.
- `allowedEditorNodeNames(authoredManifests)` and `assertClosedEditorContent(content, authoredManifests)` derive their allow-list and per-node attr sets from the **same** set, so the registered node set and the allow-list stay in lock-step. Authored node attrs are read from the built TipTap node (`_getNodeAttrNames`) so the attr allow-list can never drift from what the node serializes.
- `active/` ∪ `archived/` feed the schema (so documents referencing an archived block still render and edit); only `active/` feeds the palette. `quarantine/` and `pending/` are excluded — they never passed the gate.
- The installed manifest set flows through an App-level `AuthoredManifestsContext` parallel to `BrandBlocksContext` (the active-authored palette channel), so palette and schema refresh on the same cadence. It is **not** routed through `loadAllBlocks()`, which is synchronous and consumed at module-load time; authored manifests are per-machine runtime filesystem contents and are layered on per editor instance instead.

### Load timing

`useEditor` builds the schema once at mount and TipTap cannot add node types to a live schema. `DocumentView` therefore **remounts the editor via a `key`** keyed on the manifest-slug signature; the context default `[]` means a mount with no providers (and every existing test) gets the static schema synchronously, preserving today's behavior. A document opened before the manifest set has loaded (the boot race) transiently renders with the static schema — TipTap drops unknown content rather than throwing (`enableContentCheck` defaults to false) — and is restored on the keyed remount once the set arrives.

## Why this is consistent with the security model

Widening a closed boundary from filesystem contents is acceptable here because:

- **ADR-0013** makes "the manifest can never carry executable code" a hard architectural property: the runtime expander is fixed app-bundled code that reads only declarative fields. A tampered or corrupt sidecar can at worst describe an odd declarative block — never run code.
- **ADR-0006** places the trust gate at *receive time* (the Rust AST lint) and treats the on-disk `active/`/`archived/` contents as already-validated storage. The loader re-reads the sidecar rather than re-linting; it applies only a light robustness guard (skip on JSON-parse failure or missing `slug`) to survive partial cloud-sync corruption — **not** as a security control.
- A malformed installed block that throws during render is contained by the render watchdog's error boundary (ADR-0006 prerequisite).

So the set is "closed over installed + validated manifests," not arbitrary input.

## Consequences

- `closed-schema.test.ts` derives its expected node set from the manifests it passes to `createEditorExtensions`, asserting the registered set and the allow-list move together for any installed set — the invariant now holds per-instance rather than against a single constant.
- An authored slug that collides with a Standard block name (or a duplicate slug across `active`/`archived`) is dropped from the schema (first occurrence wins), so a manifest can never shadow or double-register a node.
- Persisting/round-tripping an inserted Authored block through the DocModel is a separate concern handled by **ADR-0016**.
