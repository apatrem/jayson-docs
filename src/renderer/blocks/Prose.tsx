import type { CSSProperties, FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import { ProseRenderer } from "../ProseRenderer";
import type { ProseBlock } from "../../schema/blocks/prose";

export interface ProseProps {
  block: ProseBlock;
}

export const Prose: FC<ProseProps> = ({ block }) => {
  const brand = useBrandTokens();

  const style: CSSProperties = {
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: resolveBrandToken(brand, "colors.semantic.textPrimary"),
    textAlign: block.align,
    margin: 0,
    marginBottom: brand.spacing.unit * 1.5,
  };

  return (
    <div
      data-block-id={block.id}
      data-block-type="prose"
      data-align={block.align}
      style={style}
    >
      <ProseRenderer fragment={block.content} />
    </div>
  );
};
