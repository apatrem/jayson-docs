import type { CSSProperties, FC } from "react";
import {
  resolveAssetPath,
  type AssetContext,
} from "../../brand-tokens/resolve-asset";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import type { ImageBlock } from "../../schema/blocks/image";
import { imageMaxWidthPercent } from "../../schema/blocks/image";

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
