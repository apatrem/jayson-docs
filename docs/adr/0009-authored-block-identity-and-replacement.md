# Authored block identity is `slug + sender email`; updates from the same sender replace in place

**Status:** accepted (concretises ADR-0004's Authored-block lifecycle; affects DocModel block.type strings forever)
**Date:** 2026-05-27

## Context

A block in the DocModel is referenced by its `type` string discriminator (`"callout"`, `"chart"`, …). For Standard and Brand blocks the type is set by the developer / setup AI and is globally unique within the consultancy. For Authored blocks, multiple senders may produce blocks with the same conceptual name, the same sender may ship multiple versions over time, and documents that already use a block need defined behaviour when a new version arrives.

Four identity schemes were considered (per-file UUID, slug only, slug + sender, content hash) and three replacement strategies (always-replace, pin-to-original-version, replace-with-diff-preview).

## Decision

**Identity:** `{sender-email}:{slug}` — e.g., `alice@consultancy.com:competitive-matrix`. The sender prefix namespaces the slug (no Alice/Carol collisions) and doubles as inline provenance. The slug is set by the sender at generation time; the lint enforces a kebab-case format.

**Replacement on same-sender resend:** always-replace. v2 from Alice clobbers v1 in Bob's library. The manifest header timestamp lets Bob audit when an update arrived. Existing documents re-render with v2 — visual regressions are accepted as the cost of peer-to-peer updates.

**Coexistence:** different senders' blocks with the same slug coexist as distinct registry entries (`alice@...:competitive-matrix` vs `carol@...:competitive-matrix`). Bob sees both in the palette with the sender as a sub-label.

## Rejected alternatives

- **Per-file UUID identity.** No collisions ever, but every v2 is a new block — Bob's documents are pinned to v1 forever and Alice's updates are useless. Defeats the point of sharing.
- **Slug-only identity.** Alice's `competitive-matrix` clobbers Carol's. Forces senders to coordinate naming, which doesn't scale.
- **Content-hash identity.** Updates always coexist; Bob's library bloats with every received version. Library hygiene becomes a manual chore.
- **Replacement with diff preview before activating.** Lets Bob see "this update changes how your 3 documents look" before accepting. Real UX work for a v1; the watchdog catches the crashes that matter most. Reconsider in v1.1 if visual-regression complaints arrive.
- **Pin existing documents to v1.** Removes the whole point of receiving an update. Rejected.

## Consequences

- Authored block `type` strings contain `:` and `@` — the DocModel schema's type validator must accept this format. Standard and Brand block types remain identifier-shaped; the regex differs by tier prefix.
- The lint at receive time validates: slug is kebab-case, sender field is a syntactically valid email, type string matches `{sender}:{slug}`. Invalid identity quarantines the block.
- Sender spoofing is unaddressed at this layer — `{sender}` is data from the manifest header, not provenance. ADR-0005 and ADR-0006 already flagged this for v1.1 hardening (signed bundles / unknown-sender prompt). Same deferral applies.
- An employer change orphans Alice's existing blocks from her new email. Rare; v1 accepts this — Bob can manually accept a "re-shipped under new identity" block if needed.
- Replacement is silent for the receiver — no per-block accept/reject dialog on a v2. The lint + watchdog still gate activation; visual review happens after, in the affected documents.
