# Authored block removal is a soft archive; documents keep rendering until the file is permanently deleted

**Status:** accepted (extends ADR-0008's loader contract with a second folder; concretises the Authored-block lifecycle)
**Date:** 2026-05-27

## Context

ADR-0008 makes `generated-blocks/active/` the registry source for Brand and Authored blocks. ADR-0009 establishes that documents reference Authored blocks by `{sender}:{slug}` type strings. The remaining lifecycle question: what should "remove" mean for an Authored block when existing documents already use it?

Three-state design vs two-state: a hard delete that breaks documents is a poor match for a workflow where Authored blocks accumulate over time and a consultant wants to tidy the palette without nuking their past work. A "frozen embedded copy" interpretation (block code copied into each document) was considered and rejected because it violates the canonical-DocModel principle (memo §2) — code as data, parallel sources of truth, bypassed receive-time lint.

## Decision

Authored block removal is a **soft archive** with three distinct states:

| Action | Effect |
|---|---|
| **Remove block** | File moves `generated-blocks/active/ → generated-blocks/archived/`. Hides from palette (no new inserts). Documents still render — the loader scans both folders. |
| **Restore block** | File moves `generated-blocks/archived/ → generated-blocks/active/`. Re-appears in palette. |
| **Delete permanently** | File removed from disk entirely. Documents render `<RemovedBlockPlaceholder type="{sender}:{slug}" />`. Stronger confirmation prompt. |

The registry loader scans both `active/` and `archived/`. Both are loaded into the registry; only `active/` entries appear in the BlockPalette. The DocModel's block type still resolves to real code in both states, preserving canonical-DocModel.

**Replacement interaction with archive (per ADR-0009):** when a same-sender v2 arrives, it replaces v1 in whichever folder v1 was in. Archived stays archived; active stays active. Bob's intent — "I hid this block" — is preserved across updates.

This applies only to Authored blocks. Standard blocks are code-bundled (removed by app upgrade only). Brand blocks are install-time (removal is a devops re-run of the setup pipeline, out of consultant UX scope).

## Rejected alternatives

- **Hard delete only.** Removing a block instantly breaks documents using it — hostile UX in a workflow where consultants accumulate dozens of Authored blocks and routinely tidy.
- **Frozen per-document copy** (interpretation β from the grilling session). Embeds block code into each document. Violates canonical-DocModel: code becomes data, opening a document executes code never re-validated by the receive-time lint (ADR-0006), Alice's v2 can't reach embedded copies (defeats ADR-0009), document portability comes at a real architectural cost. Out of scope for v1; would need its own grilling pass if reconsidered.
- **Force-keep until no documents reference it.** Removal becomes a chore (find every document, edit each one, then remove). Doesn't match file-system intuition.
- **Removal blocked with a usage list, then proceed.** Useful information; doesn't solve the underlying "I want to clean the palette without losing work" need. The soft-archive does both.

## Consequences

- The block loader scans two folders, not one. Small change to the M8 loader contract — both folders contribute registry entries; only `active/` contributes palette entries. The BlockPalette filter is the only place that distinguishes them.
- Three new IPC commands (or one with a state parameter): archive, restore, permanently delete. Each calls file-system operations under the `generated-blocks/` scope.
- A library-wide "what uses this block" scan is not in v1 — removal only warns about open documents. A future "Authored block manager" UI can add the full scan.
- "Restore from trash" for permanently-deleted blocks is not in v1. If a block was on cloud-sync (D-05), the consultant can recover it from the cloud provider's history; otherwise it's gone.
- The `generated-blocks/archived/` folder needs to be added to the M8 file-scoping work (alongside `active/` and `pending/`). The Tauri capability ACL must include it.
