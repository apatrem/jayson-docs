import type { BrandTokens } from "../schema/brand";

const ALIAS_PREFIX = "colors.semantic.";

export function resolveBrandToken(brand: BrandTokens, ref: string): string {
  const direct = getByDottedPath(brand, ref);
  if (direct === undefined) {
    throw new Error(`resolveBrandToken: unknown token path "${ref}"`);
  }

  const isAliasContext = ref.startsWith(ALIAS_PREFIX);
  if (
    isAliasContext &&
    typeof direct === "string" &&
    !direct.startsWith("#") &&
    direct.includes(".")
  ) {
    const aliasTarget = `colors.${direct}`;
    const final = getByDottedPath(brand, aliasTarget);
    if (final === undefined) {
      throw new Error(
        `resolveBrandToken: alias "${ref}" -> "${direct}" did not resolve`,
      );
    }
    if (typeof final !== "string") {
      throw new Error(`resolveBrandToken: alias target is not a string`);
    }
    return final;
  }

  if (typeof direct !== "string") {
    throw new Error(`resolveBrandToken: path "${ref}" is not a string value`);
  }
  return direct;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getByDottedPath(obj: unknown, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = obj;
  for (const seg of segments) {
    if (isRecord(current) && seg in current) {
      current = current[seg];
    } else {
      return undefined;
    }
  }
  return current;
}

export function resolveChartPalette(
  brand: BrandTokens,
  kind: "qualitative" | "sequential",
): string[] {
  if (kind === "qualitative") return brand.colors.chartPalette.qualitative;
  return brand.colors.chartPalette.sequential;
}
