import React from "react";
import type { BrandTokens } from "../schema/brand";
import type { ProseMirrorFragment } from "../schema/prosemirror-fragment";
import { useBrandTokens } from "../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../brand-tokens/resolve";

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
  "strike",
]);

const SAFE_HREF = /^(?:https?:|mailto:|tel:|#)/iu;

interface ProseRendererProps {
  fragment: ProseMirrorFragment;
}

export const ProseRenderer: React.FC<ProseRendererProps> = ({ fragment }) => {
  const brand = useBrandTokens();
  return <>{renderNode(fragment, brand, 0)}</>;
};

function renderNode(
  node: unknown,
  brand: BrandTokens,
  key: number,
): React.ReactNode {
  if (!isProseNode(node)) return null;
  if (!ALLOWED_NODES.has(node.type)) return null;

  switch (node.type) {
    case "doc":
      return (
        <React.Fragment key={key}>
          {(node.content ?? []).map((child, i) => renderNode(child, brand, i))}
        </React.Fragment>
      );

    case "paragraph": {
      const align =
        (node.attrs?.align as "left" | "justify" | undefined) ?? "left";
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

function renderText(
  node: ProseNode,
  brand: BrandTokens,
  key: number,
): React.ReactNode {
  const text = node.text ?? "";
  const marks = (node.marks ?? []).filter((m) => ALLOWED_MARKS.has(m.type));

  let element: React.ReactNode = text;
  for (let i = marks.length - 1; i >= 0; i--) {
    const mark = marks[i];
    if (mark) element = wrapWithMark(mark, element, brand);
  }
  return <React.Fragment key={key}>{element}</React.Fragment>;
}

function wrapWithMark(
  mark: ProseMark,
  children: React.ReactNode,
  brand: BrandTokens,
): React.ReactNode {
  switch (mark.type) {
    case "strong":
      return <strong>{children}</strong>;

    case "em":
      return <em>{children}</em>;

    case "underline":
      return <u>{children}</u>;

    case "strike":
      return <s>{children}</s>;

    case "code":
      return (
        <code
          style={{
            fontFamily: brand.typography.fonts.mono.family,
            background: resolveBrandToken(brand, "colors.neutral.50"),
            padding: "0 0.25em",
            borderRadius: 2,
          }}
        >
          {children}
        </code>
      );

    case "link": {
      const href = sanitizeHref(mark.attrs?.href);
      return (
        <a
          href={href}
          style={{
            color: resolveBrandToken(brand, "colors.semantic.link"),
          }}
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

function sanitizeHref(rawHref: unknown): string {
  if (typeof rawHref !== "string") return "#";
  const href = rawHref.trim();
  return SAFE_HREF.test(href) ? href : "#";
}

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
  return (
    typeof n === "object" &&
    n !== null &&
    typeof (n as ProseNode).type === "string"
  );
}
