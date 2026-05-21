/**
 * resolveBrandToken — turn a dotted token path into a final value.
 *
 * Supports one level of aliasing:
 *   resolveBrandToken(brand, "colors.semantic.textPrimary")
 *     -> brand.colors.semantic.textPrimary = "neutral.800"
 *     -> resolves to brand.colors.neutral["800"] = "#1E293B"
 *
 * Direct paths return the value as-is:
 *   resolveBrandToken(brand, "colors.brand.primary")
 *     -> brand.colors.brand.primary = "#0B3D91"
 *
 * Throws on unknown paths — fail loud in dev, fail loud in tests.
 *
 * Production path: src/brand-tokens/resolve.ts
 */

import type { BrandTokens } from "../../src/schema/brand";

/**
 * The set of paths that produce alias values (strings like "neutral.800").
 * Aliases live exclusively under colors.semantic in v1.
 */
const ALIAS_PREFIX = "colors.semantic.";

/**
 * Resolve a dotted token reference against the brand tokens.
 *
 * @param brand   the loaded brand tokens (from BrandProvider)
 * @param ref     dotted path like "colors.brand.primary" or "colors.semantic.textPrimary"
 * @returns       the final resolved value (string for colors, number for sizes, etc.)
 * @throws        if the path is unknown, or the alias target is missing
 */
export function resolveBrandToken<T = string>(brand: BrandTokens, ref: string): T {
  const direct = getByDottedPath(brand, ref);
  if (direct === undefined) {
    throw new Error(`resolveBrandToken: unknown token path "${ref}"`);
  }

  // If the value is itself a string in alias-target form (e.g. "neutral.800"),
  // and the original ref came from the semantic layer, do one more lookup.
  const isAliasContext = ref.startsWith(ALIAS_PREFIX);
  if (isAliasContext && typeof direct === "string" && !direct.startsWith("#") && direct.includes(".")) {
    const aliasTarget = `colors.${direct}`;          // "neutral.800" -> "colors.neutral.800"
    const final = getByDottedPath(brand, aliasTarget);
    if (final === undefined) {
      throw new Error(`resolveBrandToken: alias "${ref}" -> "${direct}" did not resolve`);
    }
    return final as T;
  }

  return direct as T;
}

/**
 * Walks an object by a dotted path. Handles numeric/string keys uniformly.
 * Returns undefined for any missing segment — let the caller decide whether
 * to throw.
 */
function getByDottedPath(obj: unknown, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = obj;
  for (const seg of segments) {
    if (current && typeof current === "object" && seg in (current as object)) {
      current = (current as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Helper: pick the chart palette array given the block's `palette` field.
 *
 * The chart renderer needs the actual array (not a token path) to feed
 * ECharts. Encapsulated here so chart renderers stay decoupled from the
 * brand-tokens shape.
 */
export function resolveChartPalette(
  brand: BrandTokens,
  kind: "qualitative" | "sequential",
): string[] {
  if (kind === "qualitative") return brand.colors.chartPalette.qualitative;
  return brand.colors.chartPalette.sequential;
}
