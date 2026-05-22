import type { CSSProperties, FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import { ProseRenderer } from "../ProseRenderer";
import type { NumberedListBlock } from "../../schema/blocks/numbered-list";

export interface NumberedListProps {
  block: NumberedListBlock;
}

export const NumberedList: FC<NumberedListProps> = ({ block }) => {
  const brand = useBrandTokens();

  const listStyle: CSSProperties = {
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: resolveBrandToken(brand, "colors.semantic.textPrimary"),
    margin: 0,
    paddingLeft: brand.spacing.unit * 5,
    listStyleType: "decimal",
  };

  return (
    <ol
      data-block-id={block.id}
      data-block-type="numbered-list"
      style={listStyle}
    >
      {block.items.map((item, index) => (
        <li key={index}>
          <ProseRenderer fragment={item.text} />
        </li>
      ))}
    </ol>
  );
};
