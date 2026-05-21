/**
 * Reference block #7 — Callout renderer (React).
 *
 * This component renders one CalloutBlock to HTML/PDF. It is the ONLY way
 * a callout becomes visual output — both the document HTML and the PDF
 * (via Playwright's headless Chromium per memo Layer 5) go through this
 * component.
 *
 * Pattern notes for copy-adapt:
 *  - The renderer takes one prop: { block }. No other state.
 *  - It is pure — same input always produces the same output (required for
 *    deterministic PDF rendering and snapshot tests).
 *  - It consumes brand tokens via the `useBrandTokens()` hook — never inlines
 *    colors, fonts, or spacing.
 *  - It renders ProseMirror fragments via the shared <ProseRenderer> helper.
 *  - It runs WITHOUT the editor (memo §2 "renders without the editor" promise).
 *  - It is server-rendered to static HTML for PDF export — no client-side
 *    interactivity, no useState, no useEffect.
 */

import React from "react";
import type { CalloutBlock } from "./schema";
import { calloutTintTokenFor } from "./schema";
import { useBrandTokens } from "../../src/brand-tokens/useBrandTokens";   // adjust path
import { resolveBrandToken } from "../../src/brand-tokens/resolve";
import { ProseRenderer } from "../../src/renderer/ProseRenderer";

export interface CalloutProps {
  block: CalloutBlock;
}

export const Callout: React.FC<CalloutProps> = ({ block }) => {
  const brand = useBrandTokens();

  // Resolve the variant-specific tint via the brand tokens.
  const tintColorRef = calloutTintTokenFor(block.variant);
  const tintColor = resolveBrandToken(brand, tintColorRef);

  // Surface background and border are uniform across variants.
  const surfaceBg = resolveBrandToken(brand, "colors.semantic.surfaceBackground");
  const borderColor = resolveBrandToken(brand, "colors.semantic.border");
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");
  const textSecondary = resolveBrandToken(brand, "colors.semantic.textSecondary");

  // Inline styles use only brand-derived values — no hard-coded colors.
  const containerStyle: React.CSSProperties = {
    backgroundColor: surfaceBg,
    borderLeft: `4px solid ${tintColor}`,
    borderRadius: 4,
    padding: `${brand.spacing.unit * 3}px ${brand.spacing.unit * 4}px`,
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: textPrimary,
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale.bodyLg,
    fontWeight: 600,
    color: tintColor,
    marginBottom: brand.spacing.unit * 2,
  };

  const attributionStyle: React.CSSProperties = {
    marginTop: brand.spacing.unit * 2,
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
    fontStyle: "italic",
  };

  return (
    <aside
      role="note"
      aria-label={block.variant}
      data-block-id={block.id}
      data-block-type="callout"
      data-variant={block.variant}
      style={containerStyle}
    >
      {block.title && <div style={titleStyle}>{block.title}</div>}
      <ProseRenderer fragment={block.body} />
      {block.variant === "quote" && block.attribution && (
        <div style={attributionStyle}>— {block.attribution}</div>
      )}
    </aside>
  );
};

/**
 * Static renderer for PDF export.
 *
 * Playwright (memo Layer 5) prints the same HTML that the editor renders.
 * For the PDF path, we render the same <Callout> component server-side via
 * ReactDOMServer.renderToStaticMarkup, with a synchronously-resolved brand
 * context provided by the PDF export pipeline.
 *
 * No work needs to be done in this file for that — the export pipeline wraps
 * <Callout> in a BrandProvider with the synchronously-loaded brand tokens
 * and renders to static HTML. See src/export/pdf.ts.
 */
