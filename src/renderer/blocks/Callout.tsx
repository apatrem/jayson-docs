import type { CSSProperties, FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import { ProseRenderer } from "../ProseRenderer";
import type { CalloutBlock } from "../../schema/blocks/callout";
import { calloutTintTokenFor } from "../../schema/blocks/callout";

export interface CalloutProps {
  block: CalloutBlock;
}

export const Callout: FC<CalloutProps> = ({ block }) => {
  const brand = useBrandTokens();

  const tintColor = resolveBrandToken(brand, calloutTintTokenFor(block.variant));
  const surfaceBg = resolveBrandToken(brand, "colors.semantic.surfaceBackground");
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");
  const textSecondary = resolveBrandToken(brand, "colors.semantic.textSecondary");

  const containerStyle: CSSProperties = {
    backgroundColor: surfaceBg,
    borderLeft: `4px solid ${tintColor}`,
    borderRadius: 4,
    padding: `${brand.spacing.unit * 3}px ${brand.spacing.unit * 4}px`,
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: textPrimary,
  };

  const titleStyle: CSSProperties = {
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale.bodyLg,
    fontWeight: 600,
    color: tintColor,
    marginBottom: brand.spacing.unit * 2,
  };

  const attributionStyle: CSSProperties = {
    marginTop: brand.spacing.unit * 2,
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
    fontStyle: "italic",
  };

  return (
    <aside
      className="doc-keep-together"
      role="note"
      aria-label={block.variant}
      data-block-id={block.id}
      data-block-type="callout"
      data-variant={block.variant}
      style={containerStyle}
    >
      {block.title ? <div style={titleStyle}>{block.title}</div> : null}
      <ProseRenderer fragment={block.body} />
      {block.variant === "quote" && block.attribution ? (
        <div style={attributionStyle}>— {block.attribution}</div>
      ) : null}
    </aside>
  );
};
