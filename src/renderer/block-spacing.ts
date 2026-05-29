import type { BrandTokens } from "../schema/brand";
import type { Meta } from "../schema/meta";

/**
 * Default inter-block gap as a multiple of `brand.spacing.unit` (ADR-0018,
 * item 6). Matches the historical hard-coded `unit * 3`.
 */
export const DEFAULT_BLOCK_SPACING_MULTIPLE = 3;

interface MetaLayoutLike {
  layout?: { blockSpacing?: number | undefined } | undefined;
}

/**
 * Resolve the document block-spacing multiple: a per-document override
 * (`meta.layout.blockSpacing`) wins over the built-in default. Pure.
 */
export function resolveBlockSpacingMultiple(
  meta: MetaLayoutLike | Meta | null | undefined,
): number {
  const override = (meta as MetaLayoutLike | null | undefined)?.layout?.blockSpacing;
  return typeof override === "number" && override >= 0
    ? override
    : DEFAULT_BLOCK_SPACING_MULTIPLE;
}

/** Resolve the inter-block gap in pixels (brand unit × resolved multiple). */
export function resolveBlockGapPx(
  brand: Pick<BrandTokens, "spacing">,
  meta: MetaLayoutLike | Meta | null | undefined,
): number {
  return brand.spacing.unit * resolveBlockSpacingMultiple(meta);
}
