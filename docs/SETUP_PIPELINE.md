# Setup AI Pipeline — Specification

**Purpose:** specify the setup-time process that turns a consultancy's demo files into a populated `brand.yaml` and a customized block catalogue, with the safety mitigations from D-09 enforced at every step.

**Audience:** the developer implementing the setup pipeline (M1 deliverable).

**Companion to:** `DECISIONS.md` (D-08, D-09, D-16, D-17), `blocks.catalogue.yaml`, `brand.example.yaml`, `TYPES.md`.

---

## 1. The end-to-end flow

```
┌────────────────────────────────────────────────────────────────────────┐
│ INPUTS                                                                  │
│  Demo files supplied by consultancy:                                    │
│    /input/demos/                                                        │
│      *.docx, *.pptx, *.pdf  (3–10 files typical)                        │
└─────────────────────────────┬──────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 1 — INGESTION                                                     │
│  Per-format extraction:                                                 │
│    DOCX → mammoth (HTML + styles) + docx parser (raw OOXML for fonts)   │
│    PPTX → officeparser (text + layout hints)                            │
│    PDF  → pdf-parse (text) + pdf2pic (slide thumbnails for visual ref)  │
│  Output: a JSON "demo-analysis.json" with extracted text, styles,       │
│  observed colors, fonts, recurring section patterns.                    │
└─────────────────────────────┬──────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 2 — BRAND EXTRACTION                                              │
│  LLM call (Claude Opus 4.7 or equivalent) with:                         │
│    - the demo-analysis.json                                             │
│    - brand.example.yaml as the target shape                             │
│  LLM outputs: a populated brand.yaml in the example's shape.            │
│  Validate against BrandTokensSchema (TYPES.md §7).                      │
│  On validation failure → retry with corrective re-prompt (max 2).       │
└─────────────────────────────┬──────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 3 — CATALOGUE DIFF                                                │
│  LLM call with:                                                         │
│    - demo-analysis.json                                                 │
│    - blocks.catalogue.yaml (the 15 pre-built blocks)                    │
│  LLM outputs a catalogue diff:                                          │
│    - usedBlocks: [<block-ids used by the consultancy>]                  │
│    - unusedBlocks: [<block-ids never observed>]                         │
│    - newBlockProposals: [<patterns that don't fit Tier 1>]              │
│  Validate: newBlockProposals.length ≤ 10 (hard cap per D-09).           │
│  If > 10 → escalate to developer review (do not proceed).               │
└─────────────────────────────┬──────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 4 — CONSTRAINED CODE GENERATION (only if newBlockProposals.len>0) │
│  For each proposal, LLM call with:                                      │
│    - the proposal's source patterns (text + layout hints)               │
│    - the scaffold template (literal file — see §3)                      │
│    - blocks.catalogue.yaml entry for a similar Tier 1 block (few-shot)  │
│  LLM outputs a populated scaffold producing 4 files per block:          │
│    schema.ts, <Name>.tsx, <Name>Node.tsx, <name>.test.ts                │
│  Apply STATIC lint checks (see §4) — fail fast on violations.           │
└─────────────────────────────┬──────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 5 — STAGING                                                       │
│  All output → /generated-blocks/pending/ + /setup-output/brand.draft.yaml│
│  Generated TS files include the metadata header (D-09 mitigation 4).    │
│  App refuses to load anything in /pending/.                             │
└─────────────────────────────┬──────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 6 — HUMAN REVIEW (out-of-band)                                    │
│  A human (developer or technical admin) reviews:                        │
│    - brand.draft.yaml → approves, edits if needed, moves to shared      │
│      folder as brand.yaml                                               │
│    - each file in /generated-blocks/pending/ → approves and moves to    │
│      /generated-blocks/active/                                          │
│  On approval, the file's metadata header is updated with the reviewer   │
│  name + date (D-09 mitigation 4).                                       │
└─────────────────────────────┬──────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│ OUTPUTS (ready for production use)                                      │
│  ~/Consultancy-Shared/brand.yaml          (D-20 shared folder)          │
│  app-install/generated-blocks/active/     (loaded by the app)           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CLI commands

The pipeline is exposed as CLI commands that devops runs at consultancy setup. All commands live in `src/setup/`.

### `setup:scan-demos`
```bash
npm run setup:scan-demos -- --input /path/to/demos --output /path/to/setup-output
```

Runs stages 1–5. Outputs:
- `<output>/demo-analysis.json` — extracted patterns
- `<output>/brand.draft.yaml` — proposed brand tokens
- `<output>/catalogue-diff.json` — used/unused/proposed blocks
- `<output>/generated-blocks/pending/` — generated block files (if any)
- `<output>/setup-report.md` — human-readable summary

### `setup:regenerate`
```bash
npm run setup:regenerate -- --against ./generated-blocks/active --scaffold-version current
```

Re-runs Stage 4 against the current scaffold version. Outputs diffs to `pending/` for re-review (D-09 mitigation 6 — regen pipeline).

### `setup:install`
```bash
npm run setup:install
```

Interactive prompts for consultant identity, cloud-sync paths, LLM keys. Writes the local `config.yaml` and stores API keys in the OS keychain.

### `setup:validate`
```bash
npm run setup:validate -- --shared /path/to/shared-folder --generated-blocks /path/to/active
```

Sanity-check command that confirms the shared folder has a valid `brand.yaml`, every active generated block lint-passes, and nothing in `pending/` is accidentally loaded.

---

## 3. The constrained code-generation scaffold (literal template)

D-09 mitigation 1 requires AI to fill in a *scaffold*, not write free-form React. The scaffold lives at `src/setup/scaffold/`. It is the **only** thing the LLM is allowed to vary.

### `src/setup/scaffold/SCHEMA_SCAFFOLD.ts.template`
```typescript
/**
 * Generated block: {{BLOCK_NAME}}
 *
 * Generated by: {{MODEL_NAME}}
 * Generated at: {{ISO_DATE}}
 * Source patterns: {{SOURCE_PATTERNS_JSON}}
 * Reviewed by: <pending>
 * Last regen: {{ISO_DATE}}
 * Scaffold version: {{SCAFFOLD_VERSION}}
 */

import { z } from "zod";
import { BlockBaseSchema } from "../../src/schema/blocks";
import { ProseMirrorFragmentSchema } from "../../src/schema/prosemirror-fragment";
import { AssetPathSchema } from "../../src/schema/asset-path";

// ─── AI FILL: schema body ─────────────────────────────────────────────────
// AI fills in the .extend() body below. ALLOWED constructs:
//   z.string(), z.number(), z.boolean(), z.literal(...)
//   z.enum([...])
//   z.array(...).min(N).max(M)
//   z.object({...}).strict()
//   ProseMirrorFragmentSchema, AssetPathSchema
//   .optional(), .default(...), .min(...), .max(...)
// FORBIDDEN: any external import; any function definition; any side effect.
export const {{BlockName}}BlockSchema = BlockBaseSchema.extend({
  type: z.literal("{{block-id}}"),
  // {{AI_FILL: fields per the spec}}
}).strict();
// ─── END AI FILL ──────────────────────────────────────────────────────────

export type {{BlockName}}Block = z.infer<typeof {{BlockName}}BlockSchema>;
```

### `src/setup/scaffold/RENDERER_SCAFFOLD.tsx.template`
```typescript
/**
 * Generated renderer: {{BlockName}}
 * Generated by: {{MODEL_NAME}}  (see schema file for full provenance)
 */

import React from "react";
import type { {{BlockName}}Block } from "./schema";
import { useBrandTokens } from "../../src/brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../src/brand-tokens/resolve";
import { ProseRenderer } from "../../src/renderer/ProseRenderer";

export interface {{BlockName}}Props {
  block: {{BlockName}}Block;
}

export const {{BlockName}}: React.FC<{{BlockName}}Props> = ({ block }) => {
  const brand = useBrandTokens();

  // ─── AI FILL: style object ──────────────────────────────────────────────
  // AI may only construct style values from `brand.*` and primitives.
  // FORBIDDEN: hard-coded hex colors, font-family strings, px values
  // not derived from brand.spacing.unit.
  const style: React.CSSProperties = {
    // {{AI_FILL: style properties derived from brand tokens}}
  };
  // ─── END AI FILL ────────────────────────────────────────────────────────

  return (
    <div
      data-block-id={block.id}
      data-block-type="{{block-id}}"
      style={style}
    >
      {/* ─── AI FILL: JSX body ─────────────────────────────────────────── */}
      {/* AI may use: <div>, <span>, <ul>, <li>, <p>, <h1>-<h6>, <table>,
          <tr>, <td>, <th>, <figure>, <figcaption>, <img>, <aside>,
          <section>, <article>, <ProseRenderer>.
          FORBIDDEN: <script>, dangerouslySetInnerHTML, any user-input handler,
          any element with onClick/onChange/onSubmit. */}
      {/* {{AI_FILL: JSX referencing block.* fields}} */}
      {/* ─── END AI FILL ───────────────────────────────────────────────── */}
    </div>
  );
};
```

### `src/setup/scaffold/NODE_SCAFFOLD.tsx.template`
```typescript
/**
 * Generated TipTap node: {{BlockName}}
 * Generated by: {{MODEL_NAME}}  (see schema file for full provenance)
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React from "react";
import type { {{BlockName}}Block } from "./schema";

export const {{BlockName}}TipTapNode = Node.create({
  name: "{{block-id}}",
  group: "block",
  // ─── AI FILL: content model ─────────────────────────────────────────────
  // Either "block+" (block has editable rich-text children) or "" (atom).
  content: "{{AI_FILL: 'block+' or empty string}}",
  // ─── END AI FILL ────────────────────────────────────────────────────────
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-block-id"),
        renderHTML: (attrs) => ({ "data-block-id": attrs.blockId }),
      },
      // ─── AI FILL: one attribute per scalar field in the schema ──────────
      // Each attribute MUST follow the pattern above (default, parseHTML,
      // renderHTML reading/writing a data-* attribute).
      // {{AI_FILL: additional attributes}}
      // ─── END AI FILL ────────────────────────────────────────────────────
    };
  },

  parseHTML() {
    return [{ tag: '[data-block-type="{{block-id}}"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-block-type": "{{block-id}}" }), 0];
  },

  addCommands() {
    return {
      insert{{BlockName}}: () => ({ commands }) =>
        commands.insertContent({
          type: this.name,
          attrs: {
            blockId: crypto.randomUUID(),
            // {{AI_FILL: default attrs from schema}}
          },
          content: [{ type: "paragraph", content: [] }],
        }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer({{BlockName}}NodeView);
  },
});

const {{BlockName}}NodeView: React.FC<{
  node: { attrs: Record<string, unknown> };
  updateAttributes: (attrs: Record<string, unknown>) => void;
}> = ({ node, updateAttributes }) => {
  // ─── AI FILL: minimal editing UI ────────────────────────────────────────
  // FORBIDDEN: same restrictions as the renderer JSX body.
  // {{AI_FILL: editing UI as JSX}}
  // ─── END AI FILL ────────────────────────────────────────────────────────
  return <NodeViewWrapper>{/* fill above */}</NodeViewWrapper>;
};

export function {{blockName}}BlockToProseMirror(block: {{BlockName}}Block): unknown {
  return {
    type: "{{block-id}}",
    attrs: {
      blockId: block.id,
      // {{AI_FILL: pass-through scalar fields}}
    },
    // {{AI_FILL: content array if content is "block+"}}
  };
}

export function proseMirrorTo{{BlockName}}Block(node: { attrs: Record<string, unknown>; content?: unknown[] }): {{BlockName}}Block {
  return {
    id: node.attrs.blockId as string,
    type: "{{block-id}}",
    // {{AI_FILL: rebuild block fields from node.attrs and node.content}}
  } as {{BlockName}}Block;
}
```

### `src/setup/scaffold/TEST_SCAFFOLD.test.ts.template`
A reduced version of the callout test file with the five layers and AI fill-ins for fixtures.

---

## 4. Static lint enforcement

**File:** `src/setup/lint-generated.ts`

The lint runs after each Stage 4 LLM call. **Every check below fails the generation** — there is no soft warning.

```typescript
// Pseudo-spec — implement with a TypeScript AST walker (ts-morph or @typescript-eslint/parser).

const WHITELISTED_IMPORTS = [
  "react",
  "@tiptap/core",
  "@tiptap/react",
  "@tiptap/pm",
  "@tiptap/starter-kit",
  "zod",
  "echarts/core",
  "echarts/charts",
  "echarts/components",
  "echarts/renderers",
  /* relative imports to:
     ../../src/schema/...
     ../../src/brand-tokens/...
     ../../src/block-primitives/...
     ./schema
  */
];

const FORBIDDEN_AST_NODES = [
  "JSXAttribute[name=dangerouslySetInnerHTML]",
  "Identifier[name=eval]",
  "Identifier[name=Function]",          // when used as a constructor
  "MemberExpression[object.name=window]",
  "MemberExpression[object.name=document]",  // direct DOM access in renderers
  "CallExpression[callee.name=fetch]",
  "CallExpression[callee.name=XMLHttpRequest]",
  "NewExpression[callee.name=WebSocket]",
  "TemplateLiteral with #-prefixed hex colors",         // hard-coded colors
  "JSXExpressionContainer with raw style strings",       // CSS injection
];

interface LintResult {
  ok: boolean;
  violations: Array<{
    file: string;
    line: number;
    column: number;
    rule: string;
    message: string;
  }>;
}

export function lintGeneratedBlock(filePath: string): LintResult { /* ... */ }
```

**Hex-color detection** — the lint walks every string literal and template-literal in the file and rejects any matching `/^#([0-9A-Fa-f]{3}){1,2}$/`. The only legitimate source of colors is `brand.colors.*` resolved at runtime.

**Import whitelist** — the lint rejects any `ImportDeclaration` whose source isn't in the whitelist. Relative imports are matched against the allowed prefixes.

---

## 5. LLM prompt structure

### Stage 2 prompt (brand extraction)

```
SYSTEM:
You extract brand identity from a consultancy's demo materials into a strict
YAML structure. Output VALID YAML conforming to the schema shown.

You may ONLY emit values you can support from the analysis input. For values
not in the input, use the field's default from the example, or omit if optional.

Never invent: company name, fees, team members, references.
For uncertain colors: emit the closest match observed in the demos.

USER:
<<demo-analysis.json>>

The target shape (with field descriptions in comments):
<<brand.example.yaml>>

Produce: a populated brand.yaml.
```

### Stage 3 prompt (catalogue diff)

```
SYSTEM:
You are reviewing a consultancy's demo files to identify which block types
from a pre-built catalogue they use, and whether any observed patterns
require a new block type.

You may propose at most 10 new blocks. If you think more are needed, output
{"escalate": true, "reason": "..."} and stop.

A new block should be proposed ONLY if:
- The pattern appears ≥ 2 times across the demo files, AND
- It cannot be expressed by any Tier 1 block with brand-token tweaks alone

USER:
<<demo-analysis.json>>

The pre-built block catalogue:
<<blocks.catalogue.yaml>>

Produce a catalogue diff in this shape:
{
  "usedBlocks": ["block-id-1", "block-id-2", ...],
  "unusedBlocks": ["block-id-3", ...],
  "newBlockProposals": [
    {
      "proposedId": "kebab-case-id",
      "name": "Display Name",
      "description": "One-line description",
      "observedIn": ["file.docx:p.12", "deck.pptx:slide-7"],
      "proposedSchema": { /* shape similar to blocks.catalogue.yaml entries */ },
      "rationale": "Why a new block is needed; why no Tier 1 block fits."
    }
  ]
}
```

### Stage 4 prompt (code generation, per new block)

```
SYSTEM:
You generate four files implementing a new block, by filling in the scaffold
templates provided. You MUST stay within the AI_FILL regions; do not modify
any line outside those regions.

Rules (lint enforced):
1. No imports outside the whitelist.
2. No dangerouslySetInnerHTML, eval, fetch, XMLHttpRequest, WebSocket.
3. No hard-coded hex colors (#0B3D91 forbidden). Use brand tokens.
4. No direct DOM access (window, document) in renderers.
5. Schema must be .strict() at the top level.
6. Every schema field must have a TypeScript type via z.infer.

USER:
Block to implement:
<<proposal from Stage 3>>

A similar pre-built block to use as a few-shot example:
<<contents of reference/callout/* >>

Scaffold templates:
<<SCHEMA_SCAFFOLD.ts.template>>
<<RENDERER_SCAFFOLD.tsx.template>>
<<NODE_SCAFFOLD.tsx.template>>
<<TEST_SCAFFOLD.test.ts.template>>

Produce four files with AI_FILL regions filled in.
```

---

## 6. File layout produced by the pipeline

After `setup:scan-demos` completes (for a consultancy with 2 new blocks proposed):

```
setup-output/
├── demo-analysis.json
├── brand.draft.yaml                          ← human reviews + moves to shared folder
├── catalogue-diff.json
├── setup-report.md                           ← human-readable summary
└── generated-blocks/
    └── pending/                              ← app refuses to load these
        ├── patent-landscape/
        │   ├── schema.ts                     ← header: Reviewed by: <pending>
        │   ├── PatentLandscape.tsx
        │   ├── PatentLandscapeNode.tsx
        │   └── patent-landscape.test.ts
        └── stakeholder-map/
            ├── schema.ts
            ├── StakeholderMap.tsx
            ├── StakeholderMapNode.tsx
            └── stakeholder-map.test.ts
```

After the human reviewer approves, files move to:
```
app-install/generated-blocks/
└── active/
    ├── patent-landscape/
    │   └── ... (header now: Reviewed by: <name> on <date>)
    └── stakeholder-map/
        └── ...
```

---

## 7. Acceptance criteria for the setup pipeline (M1)

- [ ] `setup:scan-demos` runs end-to-end on a fixture demo directory (provide 1 sample DOCX + 1 PPTX in `tests/fixtures/setup-demos/`).
- [ ] Output includes a valid `brand.draft.yaml` that passes `BrandTokensSchema.parse(...)`.
- [ ] Output includes a `catalogue-diff.json` with `usedBlocks`, `unusedBlocks`, `newBlockProposals`.
- [ ] When > 10 new blocks are proposed, the pipeline outputs `{"escalate": true, ...}` and exits non-zero.
- [ ] Generated block files all land in `/pending/` (none in `/active/`).
- [ ] Generated block files all pass the lint (whitelist + forbidden patterns + hex-color check).
- [ ] The app refuses to load any block whose file is still in `/pending/` (automated test: place a block in `/pending/`, assert the editor's block palette does NOT show it).
- [ ] A deliberately-malicious LLM output (e.g., one that includes `dangerouslySetInnerHTML`) fails the lint with a clear error message.
- [ ] The regen pipeline (`setup:regenerate`) detects scaffold-version mismatch and routes re-generated files to `/pending/` for re-review.

---

## 8. Risk register for the pipeline

| Risk | Likelihood | Mitigation |
|---|---|---|
| LLM produces invalid YAML for brand | Medium | Schema validation + max 2 retries with corrective re-prompt |
| LLM produces code that lints but is buggy at runtime | High | Auto-generated tests (Layer 1-2 schema tests at minimum) + human review gate |
| LLM proposes redundant new blocks (when a Tier 1 fits) | Medium | Few-shot the prompt with the full Tier 1 catalogue; explicit "is there a Tier 1 fit?" check in the prompt |
| Demo files contain client-confidential content sent to LLM | Low | Setup runs once with curated demos; document this in the setup runbook; redact client names before LLM call |
| Generated code passes lint but uses an API that doesn't exist (hallucination) | Medium | Run `tsc --noEmit` after generation; reject if compilation fails |
| The scaffold drifts from the production block pattern over time | Medium | The reference callout block IS the scaffold's tested form. Any change to the scaffold updates `reference/callout/` first; CI compares the two for parity |

---

## 9. Open items for the setup pipeline

These tie back to `DECISIONS.md` open items:

- **O-04 — Anonymization workflow.** Before sending demo content to the LLM, should we auto-redact client names? Likely yes for the brand-extraction stage (the brand doesn't need client names); less clear for the catalogue-diff stage. Resolve before M1.
- **O-08 — Half-day technical scan.** TipTap node-view ergonomics for the more complex generated blocks (chart-like, table-like) need a spike before the scaffold is finalized.

---

## 10. The runbook (for devops on first install at a new consultancy)

1. Collect 3–10 demo files from the consultancy (DOCX/PPTX/PDF). Put them in `/input/demos/`.
2. Run `npm run setup:scan-demos -- --input /input/demos --output /tmp/setup-output`.
3. Read `/tmp/setup-output/setup-report.md`. Confirm with the consultancy that the brand details look right.
4. Edit `/tmp/setup-output/brand.draft.yaml` if needed. Move it to `~/Consultancy-Shared/brand.yaml`.
5. If there are files in `/tmp/setup-output/generated-blocks/pending/`:
   - Review each file (schema, renderer, node, test).
   - Run `npm run setup:validate -- --generated-blocks /tmp/setup-output/generated-blocks/pending` to confirm lint passes.
   - For each approved block, update the metadata header with reviewer name + date, then move the block's folder to `app-install/generated-blocks/active/`.
6. Run `npm run setup:install` on each consultant's machine to configure their identity and LLM keys.
7. Done. Consultants can open the app and start working.
