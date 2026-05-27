# Three-tier block library; Authored blocks auto-install via lint + watchdog

**Status:** accepted (amends D-08 and the §3 block-library description in the memo; supersedes the "10 per setup pass" cap)
**Date:** 2026-05-27

## Context

D-08 and memo §3 (Layer 1) describe a two-tier block library: 15 Standard blocks shipped with the app + up to 10 Brand blocks generated at setup time, both closed once approved.

The actual usage pattern is materially larger and adds a third tier the existing decisions do not contemplate:

- ~15 **Standard blocks** (unchanged from D-08 Tier 1).
- ~15 **Brand blocks** per consultancy, generated and refined at setup (D-08 Tier 2 in spirit — but ~50% above the documented cap of 10, and the "refined" phase implies the setup pass is iterative, not one-shot).
- **30+ Authored blocks** per consultancy over the system's lifetime: generated on demand by individual consultants, shareable peer-to-peer by email. This tier does not exist in the current docs.

D-09's review model (`/pending/` → human approves → `/active/`) was designed for one central reviewer handling a small setup batch. It does not describe what happens when one consultant emails another a freshly generated block.

## Decision

Adopt a three-tier model with one shared technical foundation (single-file block manifest + registry) and three different trust/lifecycle gates:

| Tier | Origin | Trigger | Gate before activation |
|------|--------|---------|------------------------|
| Standard | Developer | Build time | Code review (normal PR flow) |
| Brand | Setup AI | Install + refinement passes | Human review (D-09 unchanged) |
| Authored | Consultant + AI | On demand, anytime | Lint + runtime watchdog (ADR-0001) only — no human gate |

The cap of "10 per setup pass" from D-08 is removed. Brand blocks are sized at ~15 per consultancy by current observation; Authored blocks have no cap.

Authored blocks travel as single-file portable artifacts. On receipt:

1. The file is verified against the extended forbidden-patterns lint from ADR-0001.
2. If it passes, it auto-installs into the recipient's active library.
3. If it fails, it is quarantined and the recipient is shown why.

## Rejected alternatives

- **Keep the two-tier model and treat Authored blocks as ad-hoc Brand blocks.** Forces every shared block through a human review, which kills the peer-to-peer email workflow that motivates Tier 3 in the first place.
- **Trust emailed blocks unconditionally (no lint, no watchdog).** Smoothest UX, but turns email into a code-execution channel. Rejected: this regresses against every defense ADR-0001 preserved.
- **Require a human review on Authored blocks too (mirror D-09).** Highest assurance, but at 30+ Authored blocks per consultancy and peer-to-peer sharing, the review queue would dwarf the value. Rejected as the default; may resurface for blocks from untrusted senders (see Consequences).

## Consequences

- **Single-file manifest pattern becomes mandatory.** A block must be one self-contained artifact — you cannot email a multi-file edit across `mapping.ts`, `Editor.tsx`, the schema folder, and `nodes/`. The block registry refactor (TBD task) is no longer an optional cleanup; it is the surface the Authored-block pipeline writes to. The 15 Standard blocks and existing Brand-block path must be reshaped to match the same single-file pattern.
- **The watchdog (ADR-0001) is now load-bearing.** It was designed as one layer among many; for Authored blocks it is the *only* runtime defense after the lint. The lint allow-list must be tightened explicitly for this tier before Tier 3 ships — at minimum, an "AST shape must match the manifest scaffold" check on top of the existing pattern-based rules.
- **Email is spoofable.** A future hardening step is a signed-bundle format and/or a "trust this sender" affordance that downgrades blocks from unknown senders to the human-review gate. Not in v1; flagged here so a reviewer doesn't assume email-of-origin equals identity-of-author.
- **R6 ("closed library per consultancy instance") softens.** The library is closed *at any given moment* but evolves as consultants generate and share Authored blocks. The "closed-once-installed" framing in the memo needs updating.
- **D-08 is amended:** the cap of 10 is removed; Brand-block sizing is documented at ~15 by observation; Tier 3 is introduced.

## Deferred

- **Organisation-shared Authored block library.** A shared place where Authored blocks from across a consultancy accumulate for colleagues to discover, vs. today's email-only sharing. Out of scope for v1; flagged in CONTEXT.md so it isn't re-invented ad-hoc.
