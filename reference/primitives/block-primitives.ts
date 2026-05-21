/**
 * Block primitives — small shared components every block renderer can use.
 *
 * These are the building blocks for layout inside a block (stacks, spacers,
 * captions) — NOT visual primitives like icons or buttons. The closed set
 * keeps generated blocks (D-09) from reaching for arbitrary React.
 *
 * The constrained code-gen scaffold (SETUP_PIPELINE.md §3) whitelists this
 * module — generated blocks may import only from here, `react`, brand-token
 * helpers, and the standard runtime libs.
 *
 * Production path: src/block-primitives/index.ts
 */

import React from "react";
import { useBrandTokens } from "./useBrandTokens";

// ── Layout primitives ──────────────────────────────────────────────────────

interface StackProps {
  direction?: "vertical" | "horizontal";
  /** Spacing step (1-based) into brand.spacing.scale */
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "space-between";
  children: React.ReactNode;
}

/** Vertical or horizontal stack with brand-derived gap. */
export const Stack: React.FC<StackProps> = ({
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
  /** Spacing step (1-based) into brand.spacing.scale */
  size?: number;
}

/** Pure spacer — flex-grow when size omitted, else fixed brand-derived height. */
export const Spacer: React.FC<SpacerProps> = ({ size }) => {
  const brand = useBrandTokens();
  if (size === undefined) {
    return <div style={{ flex: 1 }} />;
  }
  const px = brand.spacing.unit * (brand.spacing.scale[size] ?? size);
  return <div style={{ height: px, width: px, flexShrink: 0 }} />;
};

// ── Text primitives ────────────────────────────────────────────────────────

interface CaptionProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}

/** Figure caption — used by image, chart, table block renderers. */
export const Caption: React.FC<CaptionProps> = ({ children, align = "left" }) => {
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
  children: React.ReactNode;
}

/** Small uppercase eyebrow label — used above section titles, KPI labels, etc. */
export const Overline: React.FC<OverlineProps> = ({ children }) => {
  const brand = useBrandTokens();
  return (
    <span
      style={{
        fontFamily: brand.typography.fonts.body.family,
        fontSize: brand.typography.scale.overline ?? brand.typography.scale.caption,
        textTransform: "uppercase",
        letterSpacing: brand.typography.letterSpacing?.wide ?? "0.04em",
        color: brand.colors.neutral["500"],
      }}
    >
      {children}
    </span>
  );
};

// ── Surface primitives ─────────────────────────────────────────────────────

interface CardProps {
  /** Tint stripe along the left edge (brand-token value). Pass undefined for none. */
  accent?: string;
  children: React.ReactNode;
}

/** Branded card surface — used by callout, KPI cards, table headers, etc. */
export const Card: React.FC<CardProps> = ({ accent, children }) => {
  const brand = useBrandTokens();
  return (
    <div
      style={{
        backgroundColor: brand.colors.neutral["50"],
        border: `1px solid ${brand.colors.neutral["200"]}`,
        borderLeft: accent ? `4px solid ${accent}` : `1px solid ${brand.colors.neutral["200"]}`,
        borderRadius: 4,
        padding: brand.spacing.unit * 3,
      }}
    >
      {children}
    </div>
  );
};

// ── CSS helpers (private) ──────────────────────────────────────────────────

function cssAlign(a: StackProps["align"]): React.CSSProperties["alignItems"] {
  switch (a) {
    case "start": return "flex-start";
    case "center": return "center";
    case "end": return "flex-end";
    default: return "stretch";
  }
}

function cssJustify(j: StackProps["justify"]): React.CSSProperties["justifyContent"] {
  switch (j) {
    case "start": return "flex-start";
    case "center": return "center";
    case "end": return "flex-end";
    case "space-between": return "space-between";
    default: return "flex-start";
  }
}

// ── Re-exports for one-stop import ─────────────────────────────────────────

export { useBrandTokens } from "./useBrandTokens";
export { resolveBrandToken, resolveChartPalette } from "./resolve";
export { resolveAssetPath } from "./resolve-asset";
export { ProseRenderer } from "./ProseRenderer";
export { BrandProvider } from "./BrandProvider";
