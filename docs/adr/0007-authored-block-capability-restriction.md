# Authored blocks restricted to the simple-container subset; extended capabilities deferred

**Status:** accepted (refines ADR-0004 by scoping Tier 3 capabilities; prerequisite of the registry-manifest shape design)
**Date:** 2026-05-27

## Context

ADR-0004 established that Authored blocks (Tier 3) ship without a human review gate, relying on the lint + watchdog (hardened per ADR-0006). The 15 Standard blocks span a wide expressive range — from simple rich-text containers (Callout, Heading, Prose) to atom nodes with JSON payloads and side panels (Chart, KpiCards, Table) to embedded engines (ECharts, Mermaid). Whether Authored blocks can use the full range, or only a subset, has direct consequences for the codegen target, the lint surface, and the consultant authoring experience.

## Decision

Authored blocks are restricted to a simple-container subset:

| Capability | Standard | Brand | Authored |
|---|---|---|---|
| Rich-text content | ✅ | ✅ | ✅ |
| Static attrs (string, enum, number, bool) | ✅ | ✅ | ✅ |
| Repeated items via simple list attrs | ✅ | ✅ | ✅ |
| Brand-token consumption | ✅ | ✅ | ✅ |
| Atom node with JSON payload | ✅ | ✅ | ❌ |
| Custom side panel | ✅ | ✅ | ❌ |
| ECharts / Mermaid embed | ✅ | ✅ | ❌ |

Consultants whose authoring need exceeds the subset must escalate to a Brand-block request (devops + human review per D-09).

## Rejected alternatives

- **Full expressive power for Authored blocks.** Widens the codegen target — the AI must coordinate a TipTap atom node, a side panel, a payload schema, and a renderer, all in one file. The lint coverage gap on echarts formatter functions (ADR-0006 known limitation) also stops being theoretical. Rejected as the initial scope; reconsider as the deferred feature below.
- **Even tighter subset — text-only, no attrs.** Would cover only the most trivial blocks; the realistic authored use cases (consultancy-specific callout variants, sector-specific summary boxes) need at least string/enum attrs. Too restrictive.

## Consequences

- The registry manifest can be designed with a smaller declarative core for Authored blocks; the escape hatches needed for Chart-style atom nodes only need to exist in the Standard/Brand surface, not in the codegen-facing surface.
- The lint gains a "this file declares an Authored block" mode that rejects atom-node markers, side-panel registrations, and echarts/mermaid imports — additional rules on top of the ADR-0001 / ADR-0006 baseline.
- A real-world friction is expected: 10–20% of "I wish I could author this myself" attempts will hit the wall and have to be escalated to a Brand-block request. Acceptable as the initial trade-off; the deferred feature below addresses it if the friction proves high.

## Deferred

- **Extended Authored-block capabilities.** Promotion of one or more capabilities currently restricted to Standard/Brand (atom nodes with JSON payloads, custom side panels, ECharts/Mermaid embeds) into the Authored tier. Triggered when (a) real usage shows the simple-container subset is too restrictive, and (b) the codegen + lint can be hardened to vet the additional surface area. Captured in CONTEXT.md "Deferred concepts."
