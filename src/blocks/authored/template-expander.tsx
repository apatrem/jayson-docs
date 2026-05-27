/**
 * Expands an AuthoredBlockManifest's declarative renderer template into React
 * elements at render time.
 *
 * This module is the ONLY code that turns a RenderNode tree into UI — it is
 * the "built-in, app-bundled code" described in ADR-0013.  The manifest itself
 * never executes; this expander does.
 */

import type { CSSProperties, FC, ReactElement } from "react";
import type {
  AuthoredBlockManifest,
  AttrRef,
  ColorToken,
  RenderNode,
} from "./defineAuthoredBlock";
import type { BrandTokens } from "../../schema/brand";
import type { ProseMirrorFragment } from "../../schema/prosemirror-fragment";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import { ProseRenderer } from "../../renderer/ProseRenderer";

// ─── Type helpers ─────────────────────────────────────────────────────────────

/** The loosely-typed block record produced by the Authored-block schema. */
export interface AuthoredBlockRecord {
  id: string;
  type: string;
  note?: string;
  body?: ProseMirrorFragment;
  [key: string]: unknown;
}

function isAttrRef(v: unknown): v is AttrRef {
  return (
    typeof v === "object" &&
    v !== null &&
    "$ref" in v &&
    typeof (v as AttrRef).$ref === "string"
  );
}

function isColorToken(v: unknown): v is ColorToken {
  return (
    typeof v === "object" &&
    v !== null &&
    "$token" in v &&
    typeof (v as ColorToken).$token === "string"
  );
}

// ─── Resolution helpers ───────────────────────────────────────────────────────

function resolveText(
  value: string | AttrRef,
  attrs: AuthoredBlockRecord,
): string {
  if (isAttrRef(value)) {
    return String(attrs[value.$ref] ?? "");
  }
  return value;
}

function resolveColor(
  token: ColorToken | undefined,
  brand: BrandTokens,
): string | undefined {
  if (token === undefined || !isColorToken(token)) return undefined;
  try {
    return resolveBrandToken(brand, token.$token);
  } catch {
    return undefined;
  }
}

function spacingPx(units: number | undefined, brand: BrandTokens): number | undefined {
  if (units === undefined) return undefined;
  return units * brand.spacing.unit;
}

// ─── Node expansion ───────────────────────────────────────────────────────────

/**
 * Recursively turns a RenderNode into a React element.
 * Pure function — no hooks, no side effects.
 *
 * @param node    The declarative render node.
 * @param attrs   The block's current attribute values.
 * @param brand   Resolved brand tokens.
 * @param keyPfx  Key prefix for React list reconciliation.
 */
export function expandRenderNode(
  node: RenderNode,
  attrs: AuthoredBlockRecord,
  brand: BrandTokens,
  keyPfx = "",
): ReactElement {
  switch (node.kind) {
    case "text": {
      const style: CSSProperties = node.color
        ? { color: resolveColor(node.color, brand) }
        : {};
      return (
        <span key={keyPfx} style={style}>
          {resolveText(node.value, attrs)}
        </span>
      );
    }

    case "heading": {
      const headingTag = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" } as const;
      const Tag = headingTag[node.level];
      return (
        <Tag
          key={keyPfx}
          style={{ fontFamily: brand.typography.fonts.heading.family }}
        >
          {resolveText(node.text, attrs)}
        </Tag>
      );
    }

    case "box": {
      const style: CSSProperties = {
        padding: spacingPx(node.padding, brand),
        backgroundColor: resolveColor(node.background, brand),
        borderRadius: node.borderRadius,
        boxSizing: "border-box" as const,
      };
      return (
        <div key={keyPfx} style={style}>
          {node.children.map((child, i) =>
            expandRenderNode(child, attrs, brand, `${keyPfx}-box-${i}`),
          )}
        </div>
      );
    }

    case "row": {
      const alignMap: Record<string, string> = {
        start: "flex-start",
        center: "center",
        end: "flex-end",
        "space-between": "space-between",
      };
      const style: CSSProperties = {
        display: "flex",
        flexDirection: "row",
        gap: spacingPx(node.gap, brand),
        justifyContent: node.align ? alignMap[node.align] : "flex-start",
        alignItems: "center",
      };
      return (
        <div key={keyPfx} style={style}>
          {node.children.map((child, i) =>
            expandRenderNode(child, attrs, brand, `${keyPfx}-row-${i}`),
          )}
        </div>
      );
    }

    case "column": {
      const style: CSSProperties = {
        display: "flex",
        flexDirection: "column",
        gap: spacingPx(node.gap, brand),
      };
      return (
        <div key={keyPfx} style={style}>
          {node.children.map((child, i) =>
            expandRenderNode(child, attrs, brand, `${keyPfx}-col-${i}`),
          )}
        </div>
      );
    }

    case "badge": {
      const style: CSSProperties = {
        backgroundColor: resolveColor(node.background, brand),
        color: resolveColor(node.foreground, brand),
        borderRadius: 4,
        padding: `2px ${brand.spacing.unit * 2}px`,
        fontSize: brand.typography.scale["caption"],
        fontFamily: brand.typography.fonts.body.family,
        display: "inline-block",
        lineHeight: 1.4,
      };
      return (
        <span key={keyPfx} style={style}>
          {resolveText(node.text, attrs)}
        </span>
      );
    }

    case "rich-text-slot": {
      if (attrs.body === undefined) {
        return <div key={keyPfx} className="authored-empty-body" />;
      }
      return <ProseRenderer key={keyPfx} fragment={attrs.body} />;
    }

    case "for-each": {
      const items = attrs[node.fieldId];
      if (!Array.isArray(items)) {
        return <div key={keyPfx} />;
      }
      return (
        <div key={keyPfx}>
          {(items as Record<string, unknown>[]).map((item, i) =>
            expandRenderNode(
              node.item,
              { ...attrs, ...item },
              brand,
              `${keyPfx}-each-${i}`,
            ),
          )}
        </div>
      );
    }
  }
}

// ─── Renderer factory ─────────────────────────────────────────────────────────

/**
 * Builds the React renderer component for an Authored block.
 *
 * The returned component reads brand tokens via the hook and delegates
 * rendering to expandRenderNode.  It is a standard React functional component
 * suitable for use as BlockRegistryRecord.renderer.
 *
 * Naming: the component is named "AuthoredBlock_{slug}" so it appears
 * identifiably in React DevTools.
 */
export function buildAuthoredRenderer(
  manifest: AuthoredBlockManifest,
): FC<{ block: AuthoredBlockRecord }> {
  const Renderer: FC<{ block: AuthoredBlockRecord }> = ({ block }) => {
    const brand = useBrandTokens();
    return (
      <div
        data-block-id={block.id}
        data-block-type={manifest.slug}
        className="authored-block"
      >
        {expandRenderNode(manifest.template, block, brand, "root")}
      </div>
    );
  };

  // Give the component a meaningful display name for debugging
  Object.defineProperty(Renderer, "name", {
    value: `AuthoredBlock_${manifest.slug}`,
  });

  // Return as FC<{ block: unknown }> to satisfy BlockRegistryRecord.renderer
  return Renderer as FC<{ block: AuthoredBlockRecord }>;
}
