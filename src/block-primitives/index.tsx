import type { CSSProperties, FC, ReactNode } from "react";
import { useBrandTokens } from "../brand-tokens/useBrandTokens";

interface StackProps {
  direction?: "vertical" | "horizontal";
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "space-between";
  children?: ReactNode;
}

export const Stack: FC<StackProps> = ({
  direction = "vertical",
  gap = 2,
  align = "stretch",
  justify = "start",
  children,
}) => {
  const brand = useBrandTokens();
  const gapPx = brand.spacing.unit * (brand.spacing.scale[gap] ?? gap);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction === "vertical" ? "column" : "row",
        gap: gapPx,
        alignItems: cssAlign(align),
        justifyContent: cssJustify(justify),
      }}
    >
      {children}
    </div>
  );
};

interface SpacerProps {
  size?: number;
}

export const Spacer: FC<SpacerProps> = ({ size }) => {
  const brand = useBrandTokens();
  if (size === undefined) {
    return <div style={{ flex: 1 }} />;
  }
  const px = brand.spacing.unit * (brand.spacing.scale[size] ?? size);
  return <div style={{ height: px, width: px, flexShrink: 0 }} />;
};

interface CaptionProps {
  children?: ReactNode;
  align?: "left" | "center" | "right";
}

export const Caption: FC<CaptionProps> = ({
  children,
  align = "left",
}) => {
  const brand = useBrandTokens();
  return (
    <figcaption
      style={{
        fontFamily: brand.typography.fonts.body.family,
        fontSize: brand.typography.scale.caption,
        lineHeight: brand.typography.lineHeight.normal,
        color: brand.colors.neutral["600"],
        textAlign: align,
        marginTop: brand.spacing.unit * 1,
      }}
    >
      {children}
    </figcaption>
  );
};

interface OverlineProps {
  children?: ReactNode;
}

export const Overline: FC<OverlineProps> = ({ children }) => {
  const brand = useBrandTokens();
  return (
    <span
      style={{
        fontFamily: brand.typography.fonts.body.family,
        fontSize:
          brand.typography.scale.overline ?? brand.typography.scale.caption,
        textTransform: "uppercase",
        letterSpacing: brand.typography.letterSpacing?.wide ?? "0.04em",
        color: brand.colors.neutral["500"],
      }}
    >
      {children}
    </span>
  );
};

interface CardProps {
  accent?: string;
  children?: ReactNode;
}

export const Card: FC<CardProps> = ({ accent, children }) => {
  const brand = useBrandTokens();
  return (
    <div
      style={{
        backgroundColor: brand.colors.neutral["50"],
        border: `1px solid ${brand.colors.neutral["200"]}`,
        borderLeft: accent
          ? `4px solid ${accent}`
          : `1px solid ${brand.colors.neutral["200"]}`,
        borderRadius: 4,
        padding: brand.spacing.unit * 3,
      }}
    >
      {children}
    </div>
  );
};

function cssAlign(
  a: StackProps["align"],
): CSSProperties["alignItems"] {
  switch (a) {
    case "start":
      return "flex-start";
    case "center":
      return "center";
    case "end":
      return "flex-end";
    default:
      return "stretch";
  }
}

function cssJustify(
  j: StackProps["justify"],
): CSSProperties["justifyContent"] {
  switch (j) {
    case "start":
      return "flex-start";
    case "center":
      return "center";
    case "end":
      return "flex-end";
    case "space-between":
      return "space-between";
    default:
      return "flex-start";
  }
}

export { useBrandTokens } from "../brand-tokens/useBrandTokens";
export { resolveBrandToken, resolveChartPalette } from "../brand-tokens/resolve";
export { resolveAssetPath } from "../brand-tokens/resolve-asset";
export { ProseRenderer } from "../renderer/ProseRenderer";
export { BrandProvider } from "../brand-tokens/BrandProvider";
