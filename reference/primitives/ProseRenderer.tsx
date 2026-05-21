/**
 * ProseRenderer — turn a ProseMirror JSON fragment into HTML.
 *
 * Used by every block whose schema has a rich-text field: prose, callout,
 * bullet-list (per item), numbered-list (per item), table (per cell),
 * KPI labels with marks, etc.
 *
 * Why we wrote our own (not e.g. prosemirror-to-html):
 *  - We need full control of which marks/nodes are allowed (closed schema).
 *  - We need brand-token consumption for link colors, code background, etc.
 *  - SSR-safe (no DOM dependency) for PDF export via renderToStaticMarkup.
 *  - No dangerouslySetInnerHTML — every node is rendered as a real React
 *    element. This is non-negotiable for the security model (D-09 forbids
 *    dangerouslySetInnerHTML across the codebase).
 *
 * Production path: src/renderer/ProseRenderer.tsx
 */

import React from "react";
import type { ProseMirrorFragment } from "../../src/schema/prosemirror-fragment";
import { useBrandTokens } from "./useBrandTokens";
import { resolveBrandToken } from "./resolve";

// ── The closed set of allowed nodes and marks ───────────────────────────────
// If a fragment contains a node/mark not in these sets, it is dropped silently
// (the schema should have rejected it upstream; this is defense in depth).

const ALLOWED_NODES = new Set([
  "doc",
  "paragraph",
  "text",
  "hard_break",
]);

const ALLOWED_MARKS = new Set([
  "strong",
  "em",
  "code",
  "link",
  "underline",
]);

interface ProseRendererProps {
  fragment: ProseMirrorFragment;
}

export const ProseRenderer: React.FC<ProseRendererProps> = ({ fragment }) => {
  const brand = useBrandTokens();
  return <>{renderNode(fragment, brand, 0)}</>;
};

// ── Internal: render any node by type ───────────────────────────────────────

interface BrandLike {
  typography: { fonts: { mono: { family: string } } };
  colors: Record<string, unknown>;
}

function renderNode(node: unknown, brand: BrandLike, key: number): React.ReactNode {
  if (!isProseNode(node)) return null;
  if (!ALLOWED_NODES.has(node.type)) return null;       // silent drop

  switch (node.type) {
    case "doc":
      return (
        <React.Fragment key={key}>
          {(node.content ?? []).map((child, i) => renderNode(child, brand, i))}
        </React.Fragment>
      );

    case "paragraph": {
      const align = (node.attrs?.align as "left" | "justify" | undefined) ?? "left";
      return (
        <p key={key} style={{ textAlign: align, margin: 0 }}>
          {(node.content ?? []).map((child, i) => renderNode(child, brand, i))}
        </p>
      );
    }

    case "text":
      return renderText(node, brand, key);

    case "hard_break":
      return <br key={key} />;

    default:
      return null;
  }
}

// ── Internal: render a text leaf, applying marks ────────────────────────────

function renderText(node: ProseNode, brand: BrandLike, key: number): React.ReactNode {
  const text = node.text ?? "";
  const marks = (node.marks ?? []).filter((m) => ALLOWED_MARKS.has(m.type));

  // Compose marks outside-in: marks[0] becomes outermost.
  let element: React.ReactNode = text;
  for (let i = marks.length - 1; i >= 0; i--) {
    element = wrapWithMark(marks[i], element, brand);
  }
  return <React.Fragment key={key}>{element}</React.Fragment>;
}

function wrapWithMark(mark: ProseMark, children: React.ReactNode, brand: BrandLike): React.ReactNode {
  switch (mark.type) {
    case "strong":
      return <strong>{children}</strong>;

    case "em":
      return <em>{children}</em>;

    case "underline":
      return <u>{children}</u>;

    case "code":
      return (
        <code
          style={{
            fontFamily: brand.typography.fonts.mono.family,
            // Background tint resolved from brand tokens (no hard-coding).
            background: resolveBrandToken(brand as never, "colors.neutral.50"),
            padding: "0 0.25em",
            borderRadius: 2,
          }}
        >
          {children}
        </code>
      );

    case "link": {
      const href = (mark.attrs?.href as string | undefined) ?? "#";
      // Schema-level URL validation belongs in the schema (link mark); here we
      // assume the href has been validated upstream.
      return (
        <a
          href={href}
          style={{ color: resolveBrandToken(brand as never, "colors.semantic.link") }}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    }

    default:
      return children;
  }
}

// ── Type guards ─────────────────────────────────────────────────────────────

interface ProseNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseNode[];
  text?: string;
  marks?: ProseMark[];
}

interface ProseMark {
  type: string;
  attrs?: Record<string, unknown>;
}

function isProseNode(n: unknown): n is ProseNode {
  return typeof n === "object" && n !== null && typeof (n as ProseNode).type === "string";
}
