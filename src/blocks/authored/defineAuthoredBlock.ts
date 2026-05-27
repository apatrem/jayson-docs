/**
 * defineAuthoredBlock — declarative factory for Authored blocks (Tier 3).
 *
 * Architecture:
 *   ADR-0007  authored-block capability restriction
 *   ADR-0008  block registry: two manifest APIs (imperative vs declarative)
 *   ADR-0013  authored blocks are declarative data, never executed as code
 *
 * T-159 delivers the type definitions + factory signature.
 * T-160 implements the runtime expansion (TipTap node / renderer / mapping).
 */

import type { BlockRegistryRecord } from "../defineBlock";

// ─── Attr field definitions ───────────────────────────────────────────────────
// These drive the form-based editing panel the runtime builds automatically.
// Every definition is pure data — no functions, no callbacks.

/**
 * Resolves to the current value of a named attr field in the renderer template.
 * Example: { $ref: "riskLevel" } → replaced with the attr's runtime value.
 */
export interface AttrRef {
  readonly $ref: string;
}

/**
 * A brand-token path reference, e.g. "colors.brand.primary".
 * Resolved via resolveBrandToken() by the runtime expander.
 */
export interface ColorToken {
  readonly $token: string;
}

/** Single-line text input widget. */
export interface StringAttrField {
  readonly kind: "string";
  readonly fieldId: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly maxLength?: number;
  readonly defaultValue?: string;
}

/**
 * Dropdown / segmented-control picker.
 * Options are static literals — no runtime-generated option lists.
 */
export interface EnumAttrField<T extends string = string> {
  readonly kind: "enum";
  readonly fieldId: string;
  readonly label: string;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly defaultValue?: T;
}

/** Numeric spinner / input. */
export interface NumberAttrField {
  readonly kind: "number";
  readonly fieldId: string;
  readonly label: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly defaultValue?: number;
}

/** Toggle / checkbox. */
export interface BoolAttrField {
  readonly kind: "bool";
  readonly fieldId: string;
  readonly label: string;
  readonly defaultValue?: boolean;
}

/**
 * The four flat field kinds.
 * Used standalone or as the per-item schema inside RepeatedItemAttrField.
 * No recursive nesting is allowed (keeping the manifest AST bounded).
 */
export type SimpleAttrField =
  | StringAttrField
  | EnumAttrField
  | NumberAttrField
  | BoolAttrField;

/**
 * An ordered, bounded list of items.
 * Each item is a record of SimpleAttrFields — no further nesting.
 */
export interface RepeatedItemAttrField {
  readonly kind: "repeated-item";
  readonly fieldId: string;
  readonly label: string;
  /** Per-item field definitions (flat — no nested RepeatedItemAttrField). */
  readonly itemFields: readonly SimpleAttrField[];
  readonly minItems?: number;
  readonly maxItems?: number;
}

/**
 * All attr field types permitted for Authored blocks.
 *
 * ADR-0007 capability ceiling — intentionally EXCLUDES:
 *   - JSON-payload atom fields   (Standard/Brand only — atom-node pattern)
 *   - React component fields     (Standard/Brand only — side-panel pattern)
 *   - Any function-valued field  (forbidden in all manifests per ADR-0013)
 *
 * These are structural exclusions: the TypeScript union literally does not
 * contain a member that accepts those shapes, making them compile errors.
 */
export type AttrFieldDef = SimpleAttrField | RepeatedItemAttrField;

// ─── Declarative render tree ──────────────────────────────────────────────────
//
// Pure data.  No JSX, no function values, no React elements.
// The runtime expander (T-160) turns this tree into React elements using
// built-in, app-bundled code (ADR-0013).

/** Inline text, either a literal string or resolved from an attr at render time. */
export interface TextRenderNode {
  readonly kind: "text";
  readonly value: string | AttrRef;
  readonly color?: ColorToken;
}

/** Section heading (h1 – h4 mapped to the brand typography scale). */
export interface HeadingRenderNode {
  readonly kind: "heading";
  readonly level: 1 | 2 | 3 | 4;
  readonly text: string | AttrRef;
}

/** Block-level container with optional visual treatment. */
export interface BoxRenderNode {
  readonly kind: "box";
  /** Padding in brand spacing units. */
  readonly padding?: number;
  readonly background?: ColorToken;
  readonly borderRadius?: number;
  readonly children: readonly RenderNode[];
}

/** Horizontal flex row. */
export interface RowRenderNode {
  readonly kind: "row";
  /** Gap in brand spacing units. */
  readonly gap?: number;
  readonly align?: "start" | "center" | "end" | "space-between";
  readonly children: readonly RenderNode[];
}

/** Vertical flex column. */
export interface ColumnRenderNode {
  readonly kind: "column";
  /** Gap in brand spacing units. */
  readonly gap?: number;
  readonly children: readonly RenderNode[];
}

/** Small chip / label badge. */
export interface BadgeRenderNode {
  readonly kind: "badge";
  readonly text: string | AttrRef;
  readonly background?: ColorToken;
  readonly foreground?: ColorToken;
}

/**
 * Slot for the block's rich-text ProseMirror region.
 * Only valid in manifests where content === "rich-text".
 * Replaced by a live editable region at runtime.
 */
export interface RichTextSlotRenderNode {
  readonly kind: "rich-text-slot";
}

/**
 * Repeats the item template once per entry in a RepeatedItemAttrField.
 * fieldId must reference a RepeatedItemAttrField declared in manifest.attrs.
 */
export interface ForEachRenderNode {
  readonly kind: "for-each";
  readonly fieldId: string;
  readonly item: RenderNode;
}

/**
 * All valid render node types for Authored blocks.
 *
 * ADR-0007 capability ceiling — intentionally EXCLUDES:
 *   - React elements / JSX nodes      → Standard/Brand only (arbitrary trees)
 *   - ECharts embed nodes             → Standard/Brand only (ADR-0007)
 *   - Mermaid / SVG embed nodes       → Standard/Brand only (ADR-0007)
 *   - Custom side-panel references    → Standard/Brand only (ADR-0007)
 *   - Function-valued render props    → forbidden in any manifest (ADR-0013)
 *
 * These exclusions are structural: the union contains no member that accepts
 * those shapes, making any attempt to use them a TypeScript compile error.
 */
export type RenderNode =
  | TextRenderNode
  | HeadingRenderNode
  | BoxRenderNode
  | RowRenderNode
  | ColumnRenderNode
  | BadgeRenderNode
  | RichTextSlotRenderNode
  | ForEachRenderNode;

// ─── Manifest ─────────────────────────────────────────────────────────────────

/**
 * The complete declarative manifest for an Authored block.
 *
 * ## Data-only constraint (ADR-0013)
 * All values MUST be statically evaluable: string/number/boolean literals,
 * array/object literals of the same, AttrRef/ColorToken helpers.
 * Forbidden: function expressions, arrow functions, JSX, non-literal template
 * strings, computed property keys.  The Rust AST validator enforces this at
 * receive time; TypeScript enforces it at authoring time — every field type
 * is a plain interface with no function members.
 *
 * ## Capability ceiling (ADR-0007) — enforced at the TYPE LEVEL
 * This interface has NO field that accepts:
 *   - a TipTap `Node` object       → atom-node / side-panel pattern impossible
 *   - a React `ComponentType`      → arbitrary JSX renderer impossible
 *   - an ECharts or Mermaid ref    → charting/diagram embed impossible
 *   - any function type            → all callback patterns impossible
 *
 * Attempting to pass those values is a TypeScript compile error, not a lint
 * warning.  The enforcement is architectural, not advisory.
 */
export interface AuthoredBlockManifest {
  /**
   * Kebab-case identifier, unique within the sender's scope.
   * Combined with the sender email to form the full block type string:
   * `{sender-email}:{slug}` (T-162).
   */
  readonly slug: string;
  /** Human-readable block name shown in the "Add block" dialog. */
  readonly title: string;
  /** Short palette chip label (≤ 24 characters). */
  readonly paletteLabel: string;
  /**
   * Whether the block carries a ProseMirror editable region.
   * "rich-text"  → include a `rich-text-slot` node in the template.
   * "none"       → attrs-only layout; no editable prose area.
   */
  readonly content: "rich-text" | "none";
  /** Ordered attr field definitions (rendered as the form-based side panel). */
  readonly attrs: readonly AttrFieldDef[];
  /**
   * Declarative renderer tree. Pure data, no JSX.
   * T-160's runtime expander turns this into a React element tree using
   * built-in, app-bundled code.
   */
  readonly template: RenderNode;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

import { buildAuthoredSchema, buildAllowedAttrs } from "./schema-builder";
import { buildAuthoredRenderer, type AuthoredBlockRecord } from "./template-expander";
import { buildAuthoredTipTapNode } from "./node-builder";
import type { ProseMirrorNode } from "../../editor/mapping";

// Mapping helpers — derived from the manifest at call time, no custom code

function buildToPm(
  manifest: AuthoredBlockManifest,
): (block: unknown) => ProseMirrorNode {
  return function toPm(block: unknown): ProseMirrorNode {
    const b = block as AuthoredBlockRecord;
    const attrs: Record<string, unknown> = {
      blockId: b.id,
      note: b.note ?? "",
    };
    for (const field of manifest.attrs) {
      attrs[field.fieldId] = b[field.fieldId] ?? null;
    }
    const pm: ProseMirrorNode = { type: manifest.slug, attrs };
    if (manifest.content === "rich-text" && b.body !== undefined) {
      pm.content = b.body.content as unknown[];
    }
    return pm;
  };
}

function buildFromPm(
  manifest: AuthoredBlockManifest,
): (node: ProseMirrorNode) => unknown {
  return function fromPm(node: ProseMirrorNode): AuthoredBlockRecord {
    const nodeAttrs = node.attrs ?? {};
    const record: AuthoredBlockRecord = {
      id: String(nodeAttrs.blockId ?? ""),
      type: manifest.slug,
      ...(nodeAttrs.note ? { note: String(nodeAttrs.note) } : {}),
    };
    for (const field of manifest.attrs) {
      record[field.fieldId] = nodeAttrs[field.fieldId] ?? null;
    }
    if (manifest.content === "rich-text") {
      record.body = {
        type: "doc",
        content: Array.isArray(node.content) ? node.content : [],
      };
    }
    return record;
  };
}

/**
 * Defines an Authored block (Tier 3) from a pure declarative manifest.
 *
 * Returns a `BlockRegistryRecord` compatible with both registries:
 *   - `schema-registry` receives the `SchemaEntry` subset (pure, no TipTap/React).
 *   - `runtime-registry` receives the full record with the runtime expansion.
 *
 * ## Capability ceiling — compile-time guarantee (ADR-0007 + ADR-0013)
 * The `manifest` parameter type (`AuthoredBlockManifest`) has no field that
 * accepts a TipTap Node, React ComponentType, ECharts instance, or any function.
 * Atom-node, side-panel, and ECharts/Mermaid patterns are TypeScript compile
 * errors, not lint failures.
 *
 * ## Runtime expansion (T-160)
 * Delegates to built-in helper modules:
 *   - `schema-builder.ts`   — Zod schema + allowedAttrs derivation
 *   - `template-expander.tsx` — React renderer from the declarative template
 *   - `node-builder.ts`     — TipTap node + auto-generated form-panel node view
 *   - Inline mapping helpers — toPm / fromPm from manifest shape
 *
 * @param manifest The declarative manifest. All values must be literal data.
 */
export function defineAuthoredBlock(
  manifest: AuthoredBlockManifest,
): BlockRegistryRecord {
  return {
    schemaName: manifest.slug,
    schema: buildAuthoredSchema(manifest),
    allowedAttrs: buildAllowedAttrs(manifest),
    paletteLabel: manifest.paletteLabel,
    tiptapNode: buildAuthoredTipTapNode(manifest),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderer: buildAuthoredRenderer(manifest) as BlockRegistryRecord["renderer"],
    toPm: buildToPm(manifest),
    fromPm: buildFromPm(manifest),
  };
}
