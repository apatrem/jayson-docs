import type { CSSProperties, FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import { ProseRenderer } from "../ProseRenderer";
import type { BulletListBlock } from "../../schema/blocks/bullet-list";

export interface BulletListProps {
  block: BulletListBlock;
}

export const BulletList: FC<BulletListProps> = ({ block }) => {
  const brand = useBrandTokens();

  const listStyle: CSSProperties = {
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: resolveBrandToken(brand, "colors.semantic.textPrimary"),
    margin: 0,
    paddingLeft: brand.spacing.unit * 5,
    listStyleType: "disc",
  };

  const nestedStyle: CSSProperties = {
    marginTop: brand.spacing.unit,
    paddingLeft: brand.spacing.unit * 4,
    listStyleType: "circle",
  };

  return (
    <ul
      data-block-id={block.id}
      data-block-type="bullet-list"
      style={listStyle}
    >
      {block.items.map((item, index) => (
        <li key={index}>
          <ProseRenderer fragment={item.text} />
          {item.children && item.children.length > 0 ? (
            <ul style={nestedStyle}>
              {item.children.map((child, childIndex) => (
                <li key={childIndex}>
                  <ProseRenderer fragment={child.text} />
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
};
