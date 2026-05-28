/**
 * src/blocks/image/index.tsx — full runtime manifest for the Image block.
 *
 * T-148: migrates content from src/editor/nodes/ImageNode.tsx and
 * src/renderer/blocks/Image.tsx into this single file.
 *
 * Named exports: ImageTipTapNode, imageBlockToProseMirror,
 *   proseMirrorToImageBlock, Image, ImageProps
 *
 * Default export: BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 *
 * Note: The Image renderer takes extra props (assetContext, dataUri) that the
 * block registry interface doesn't pass. DocumentRenderer supplies these directly
 * via a case "image" arm. T-157b will add a renderWithContext() hook to the
 * registry that handles this properly.
 */

// ── Schema ───────────────────────────────────────────────────────────────────
import type { ImageBlock, ImageWidth, ImageAlign } from "./schema";
import { ImageBlockSchema, imageMaxWidthPercent } from "./schema";

// ── TipTap / editor dependencies ─────────────────────────────────────────────
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { ZodType } from "zod";
import type { ComponentType, CSSProperties, FC } from "react";

// ── Brand-token / renderer dependencies ──────────────────────────────────────
import {
  resolveAssetPath,
  type AssetContext,
} from "../../brand-tokens/resolve-asset";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";

// ── Registry factory ─────────────────────────────────────────────────────────
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

// ─────────────────────────────────────────────────────────────────────────────
// TipTap node
// ─────────────────────────────────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentImage: {
      insertImage: (attrs?: {
        src?: string;
        alt?: string;
        caption?: string;
        width?: ImageWidth;
        align?: ImageAlign;
      }) => ReturnType;
    };
  }
}

export const ImageTipTapNode = Node.create({
  name: "image",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: { blockId: string | null }) => ({
          "data-block-id": attrs.blockId,
        }),
      },
      src: {
        default: "assets/placeholder.jpg",
        parseHTML: (el) =>
          el.querySelector("img")?.getAttribute("src") ??
          el.getAttribute("data-src") ??
          "assets/placeholder.jpg",
        renderHTML: (attrs: { src: string }) => ({ "data-src": attrs.src }),
      },
      alt: {
        default: "",
        parseHTML: (el) =>
          el.querySelector("img")?.getAttribute("alt") ??
          el.getAttribute("data-alt") ??
          "",
        renderHTML: (attrs: { alt: string }) => ({ "data-alt": attrs.alt }),
      },
      caption: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-caption") ?? "",
        renderHTML: (attrs: { caption: string }) => ({
          "data-caption": attrs.caption,
        }),
      },
      width: {
        default: "medium",
        parseHTML: (el) => el.getAttribute("data-width") ?? "medium",
        renderHTML: (attrs: { width: ImageWidth }) => ({
          "data-width": attrs.width,
        }),
      },
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") ?? "center",
        renderHTML: (attrs: { align: ImageAlign }) => ({
          "data-align": attrs.align,
        }),
      },
      note: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note") ?? "",
        renderHTML: (attrs: { note: string }) => ({ "data-note": attrs.note }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-block-type="image"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-block-type": "image" }),
    ];
  },

  addCommands() {
    return {
      insertImage:
        (
          attrs: {
            src?: string;
            alt?: string;
            caption?: string;
            width?: ImageWidth;
            align?: ImageAlign;
          } = {},
        ) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              src: attrs.src ?? "assets/placeholder.jpg",
              alt: attrs.alt ?? "Image",
              caption: attrs.caption ?? "",
              width: attrs.width ?? "medium",
              align: attrs.align ?? "center",
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

const ImageNodeView: FC<NodeViewProps> = ({ node, selected }) => {
  const brand = useBrandTokens();
  const blockId = String(node.attrs.blockId);
  const caption = node.attrs.caption as string | undefined;
  const block: ImageBlock = {
    id: blockId,
    type: "image",
    src: String(node.attrs.src),
    alt: String(node.attrs.alt),
    width: (node.attrs.width as ImageWidth | undefined) ?? "medium",
    align: (node.attrs.align as ImageAlign | undefined) ?? "center",
    ...(caption ? { caption } : {}),
  };
  const assetContext: AssetContext = {
    sharedFolderPath: "/shared",
    docFolderPath: "/docs",
    brand,
  };

  return (
    <NodeViewWrapper
      className="image-node-view"
      data-block-id={blockId}
      contentEditable={false}
      style={editorBlockStyle(selected)}
    >
      <Image block={block} assetContext={assetContext} />
    </NodeViewWrapper>
  );
};

function editorBlockStyle(selected: boolean): CSSProperties {
  return {
    outline: selected ? "2px solid var(--brand-primary, #0B3D91)" : "none",
    outlineOffset: 4,
    cursor: "pointer",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ProseMirror mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

type ImagePmNode = {
  attrs: {
    blockId: string;
    src: string;
    alt: string;
    caption: string;
    width: ImageWidth;
    align: ImageAlign;
    note: string;
  };
};

export function imageBlockToProseMirror(block: ImageBlock): {
  type: string;
  attrs: ImagePmNode["attrs"];
} {
  return {
    type: "image",
    attrs: {
      blockId: block.id,
      src: block.src,
      alt: block.alt,
      caption: block.caption ?? "",
      width: block.width,
      align: block.align,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToImageBlock(node: ImagePmNode): ImageBlock {
  return {
    id: node.attrs.blockId,
    type: "image",
    src: node.attrs.src,
    alt: node.attrs.alt,
    caption: node.attrs.caption || undefined,
    width: node.attrs.width,
    align: node.attrs.align,
    note: node.attrs.note || undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageProps {
  block: ImageBlock;
  assetContext: AssetContext;
  dataUri?: string | undefined;
}

export const Image: FC<ImageProps> = ({ block, assetContext, dataUri }) => {
  const brand = useBrandTokens();
  const resolvedSrc = dataUri ?? resolveAssetPath(assetContext, block.src);
  const borderColor = resolveBrandToken(brand, "colors.semantic.border");

  const figureStyle: CSSProperties = {
    margin: 0,
    marginBottom: brand.spacing.unit * 3,
    textAlign: block.align,
  };

  const imgStyle: CSSProperties = {
    display: "inline-block",
    maxWidth: imageMaxWidthPercent(block.width),
    height: "auto",
    border: `1px solid ${borderColor}`,
    borderRadius: 4,
    boxShadow: `0 1px 3px ${borderColor}33`,
  };

  const captionStyle: CSSProperties = {
    marginTop: brand.spacing.unit,
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.caption,
    lineHeight: brand.typography.lineHeight.normal,
    color: resolveBrandToken(brand, "colors.semantic.textSecondary"),
    fontStyle: "italic",
  };

  return (
    <figure
      className="doc-keep-together"
      data-block-id={block.id}
      data-block-type="image"
      data-width={block.width}
      data-align={block.align}
      style={figureStyle}
    >
      <img src={resolvedSrc} alt={block.alt} style={imgStyle} />
      {block.caption ? (
        <figcaption style={captionStyle}>{block.caption}</figcaption>
      ) : null}
    </figure>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry manifest (default export)
// ─────────────────────────────────────────────────────────────────────────────

const imageBlock = defineBlock<ImageBlock>({
  schemaName: "image",
  schema: ImageBlockSchema as ZodType<ImageBlock>,
  allowedAttrs: ["src", "alt", "caption", "width", "align", "note"] as const,
  paletteLabel: "Image",
  tiptapNode: ImageTipTapNode,
  // Image renderer requires extra props (assetContext, dataUri) that the registry
  // interface doesn't pass. DocumentRenderer supplies them directly via case "image".
  // T-157b will add renderWithContext() to handle this properly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: Image as ComponentType<{ block: any }>,
  toPm: (block) => imageBlockToProseMirror(block) as ProseMirrorNode,
  fromPm: (node) =>
    proseMirrorToImageBlock(node as unknown as ImagePmNode),
});

export default imageBlock;
