import { createElement, type CSSProperties, type FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import {
  headingScaleKey,
  type HeadingBlock,
  type HeadingLevel,
} from "../../schema/blocks/heading";

export interface HeadingProps {
  block: HeadingBlock;
}

const TAG_BY_LEVEL: Record<HeadingLevel, "h1" | "h2" | "h3" | "h4"> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
};

export const Heading: FC<HeadingProps> = ({ block }) => {
  const brand = useBrandTokens();
  const scaleKey = headingScaleKey(block.level);

  const style: CSSProperties = {
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale[scaleKey],
    lineHeight: brand.typography.lineHeight.tight,
    color: resolveBrandToken(brand, "colors.semantic.headingPrimary"),
    margin: 0,
    marginBottom: brand.spacing.unit * 2,
    fontWeight: 600,
  };

  return createElement(
    TAG_BY_LEVEL[block.level],
    {
      "data-block-id": block.id,
      "data-block-type": "heading",
      "data-level": block.level,
      "data-numbered": block.numbered ? "true" : "false",
      style,
    },
    block.text,
  );
};
