import type { BrandTokens } from "../schema/brand";
import { lookupBrandPath } from "./resolve";

export interface AssetContext {
  sharedFolderPath: string;
  docFolderPath: string;
  brand: BrandTokens;
}

export function resolveAssetPath(ctx: AssetContext, ref: string): string {
  if (ref.includes("..")) {
    throw new Error(`resolveAssetPath: path contains ".." (rejected): "${ref}"`);
  }

  if (ref.startsWith("assets/")) {
    return joinPath(ctx.docFolderPath, ref);
  }

  if (ref.startsWith("$brand:")) {
    const tokenPath = ref.slice("$brand:".length);
    const resolved = lookupBrandPath(ctx.brand, tokenPath);

    const relativePath =
      typeof resolved === "string"
        ? resolved
        : isLogoAsset(resolved)
          ? (resolved.svg ?? resolved.png)
          : undefined;

    if (!relativePath) {
      throw new Error(
        `resolveAssetPath: brand token "${tokenPath}" has no usable path`,
      );
    }
    if (relativePath.includes("..")) {
      throw new Error(
        `resolveAssetPath: brand token path contains ".." (rejected): "${relativePath}"`,
      );
    }
    return joinPath(ctx.sharedFolderPath, relativePath);
  }

  throw new Error(
    `resolveAssetPath: unrecognized path scheme. Must start with "assets/" or "$brand:". Got: "${ref}"`,
  );
}

function isLogoAsset(
  value: unknown,
): value is { svg?: string; png?: string } {
  return typeof value === "object" && value !== null && ("svg" in value || "png" in value);
}

function joinPath(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/\/+$/, ""))
    .filter(Boolean)
    .join("/");
}
