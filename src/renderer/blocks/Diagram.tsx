import type { CSSProperties, FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import {
  diagramMaxWidthPercent,
  type DiagramBlock,
} from "../../schema/blocks/diagram";

export interface DiagramProps {
  block: DiagramBlock;
  /** Pre-rendered SVG for PDF/export paths; omitted in SSR shell mode. */
  renderedSvg?: string;
}

export const Diagram: FC<DiagramProps> = ({ block, renderedSvg }) => {
  const brand = useBrandTokens();
  const borderColor = resolveBrandToken(brand, "colors.semantic.border");
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");
  const textSecondary = resolveBrandToken(brand, "colors.semantic.textSecondary");
  const surface = resolveBrandToken(brand, "colors.semantic.surfaceBackground");

  const figureStyle: CSSProperties = {
    margin: 0,
    marginBottom: brand.spacing.unit * 3,
    maxWidth: diagramMaxWidthPercent(block.width),
    width: "100%",
    fontFamily: brand.typography.fonts.body.family,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    marginBottom: brand.spacing.unit,
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale.h4,
    fontWeight: 600,
    color: textPrimary,
  };

  const shellStyle: CSSProperties = {
    border: `1px solid ${borderColor}`,
    borderRadius: brand.spacing.unit / 2,
    backgroundColor: surface,
    padding: brand.spacing.unit * 2,
    overflow: "auto",
  };

  const captionStyle: CSSProperties = {
    marginTop: brand.spacing.unit,
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
    fontStyle: "italic",
  };

  const sourceStyle: CSSProperties = {
    margin: 0,
    fontFamily: brand.typography.fonts.mono.family,
    fontSize: brand.typography.scale.caption,
    lineHeight: brand.typography.lineHeight.normal,
    color: textSecondary,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  return (
    <figure
      className="doc-keep-together"
      data-block-id={block.id}
      data-block-type="diagram"
      data-width={block.width}
      data-mermaid-source={block.source}
      style={figureStyle}
    >
      {block.title ? <h4 style={titleStyle}>{block.title}</h4> : null}
      <div style={shellStyle}>
        {renderedSvg ? (
          <img
            data-diagram-rendered="svg"
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderedSvg)}`}
            alt={block.title ?? "Diagram"}
            style={{ display: "block", maxWidth: "100%", height: "auto" }}
          />
        ) : (
          <pre style={sourceStyle} aria-label="Mermaid diagram source">
            {block.source}
          </pre>
        )}
      </div>
      {block.caption ? (
        <figcaption style={captionStyle}>{block.caption}</figcaption>
      ) : null}
    </figure>
  );
};
