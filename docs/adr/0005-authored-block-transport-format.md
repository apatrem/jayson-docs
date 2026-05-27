# Authored blocks travel as single `.tsx` files with a manifest header; scaffold-mismatch quarantines with a regenerate option

**Status:** accepted (depends on ADR-0004; concretises the "single-file portable artifact" consequence)
**Date:** 2026-05-27

## Context

ADR-0004 establishes that Authored blocks (Tier 3) must be single-file portable artifacts so a consultant can email one to a colleague, and so the lint + watchdog gate can act on one well-defined input. It does not specify what that file looks like, how it gets into the recipient's app, or what happens when the sender and recipient are on different scaffold versions.

Several plausible shapes exist:

- A plain `.tsx` source file with metadata in a header comment.
- A `.block` bundle (zipped folder containing manifest JSON + the source + any assets).
- A signed package (PGP, sigstore, or a custom signature) for tamper evidence.

And several plausible install triggers:

- OS deep-link handler so a double-click on the file opens the app and triggers an import flow.
- Drag-onto-window inside the running app.
- An explicit "Import block" menu item that opens a file picker.

And several plausible scaffold-mismatch responses:

- Auto-regenerate against the recipient's scaffold using the recipient's LLM access.
- Quarantine and let the recipient decide.
- Refuse to install.

## Decision

**File format.** A single `.tsx` file with a strict header comment containing the manifest metadata. The header captures: scaffold version the block was generated against, generator model name + version, the original prompt that produced it, the sender's email, and a generation timestamp. No zip, no binary container. **The `.tsx` payload is parsed as declarative data, not executed as code — see [ADR-0013](0013-authored-blocks-are-declarative-data.md).** The extension is a serialisation convenience (diff-friendly, IDE-highlightable, lintable with existing TypeScript tooling); the runtime never `eval`s, transpiles, or `import()`s the file.

**Install triggers.** Drag the file onto the running app window, or an explicit "Import block" menu item. No OS deep-link handler in v1 (Tauri can do it, but adds a permissions surface and edge cases the v1 doesn't need).

**Scaffold-version mismatch.** Quarantine with a "Regenerate against current scaffold" button. The regen fires the recipient's local LLM against the embedded original prompt and the recipient's current scaffold, then re-runs the lint + watchdog gate on the regenerated output. No silent auto-regen, no outright refusal.

## Rejected alternatives

- **`.block` zipped bundle.** Solves no real problem in v1 — Authored blocks have no per-block assets that justify a container, since they consume brand tokens and document-scoped assets via the existing `$brand:` / `assets/` indirections. Adds a tooling surface (zip/unzip) for zero gain. Reconsider if Authored blocks ever ship their own static images.
- **Signed packages.** Would protect against email spoofing — a real concern flagged in ADR-0004 — but the signature infrastructure (key distribution, revocation, UX) is a quarter of work for a v1 deferral. The "sender hardening" item in ADR-0004's Consequences captures this for later.
- **OS deep-link handler.** Tauri supports it, but it requires per-OS file-association registration during install, opens a separate IPC path for untrusted external input, and provides marginal UX gain over drag-and-drop in a system where the user already has the app open to author blocks.
- **Auto-regenerate on scaffold mismatch.** Silently re-running the LLM against a possibly-new scaffold can produce a block that differs visibly from what the sender intended. Bob should see what changed before activating. Auto-regen also hides cost from the recipient (LLM calls aren't free).
- **Refuse on scaffold mismatch.** Forces re-send from the original author every time the host app updates, which is hostile to Authored-block longevity.

## Consequences

- **The manifest header is the source of identity, traceability, and regen capability.** If a future change loses fidelity on round-tripping the header (e.g., a formatter strips comments), Authored-block sharing breaks. The format must be parseable from a comment block without execution, and round-tripping it must be tested.
- **Every consultant needs LLM access capable of code generation** — not just comment-to-AI access. D-11's install-time provisioning needs to cover both. Cost ledger (D-34) needs to track regen calls as their own category, since they fire on receipt rather than during authoring.
- **The lint + watchdog gate must run at receive time**, not just at build time. The lint today is a build-time AST pass. Receive-time means it either ships as runtime code in the app, or runs in a separate sidecar process the app spawns. Implementation detail to settle as part of the registry work — but the decision here commits to "lint at receive time" as the contract.
- **A spoofed email could deliver a block whose header claims a trusted sender.** The header is data, not provenance. Until signed packages land, the "sender hardening" deferral from ADR-0004 stands: an "unknown sender" affordance is the cheapest first step.
- **Drag-onto-window only works while the app is open.** That's fine — consultants always have it open when they're working with documents. If we later add a tray icon for background sync, the receive flow expands naturally; until then, no special handling needed.
