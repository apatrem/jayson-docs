/**
 * resolveAssetPath — turn a schema-validated asset path into an absolute
 * filesystem path the renderer can use.
 *
 * Two path shapes are accepted by the schema (per D-10, AssetPathSchema):
 *
 *   1. "assets/x.jpg"          — per-doc, relative to the doc folder
 *   2. "$brand:logo.primary"   — brand-token reference, resolved against
 *                                the shared brand folder
 *
 * This function MUST mirror the AssetPathSchema rules exactly. The schema
 * stops invalid paths from being saved; this function stops invalid paths
 * from being rendered (defense in depth).
 *
 * Production path: src/brand-tokens/resolve-asset.ts
 */

import type { BrandTokens } from "../../src/schema/brand";
import { resolveBrandToken } from "./resolve";

export interface AssetContext {
  /** Absolute path to the consultancy's shared folder (e.g. ~/Consultancy-Shared) */
  sharedFolderPath: string;
  /** Absolute path to the current doc's folder (e.g. ~/Docs/2026-05-21 - Acme - Proposal) */
  docFolderPath: string;
  /** The loaded brand tokens (for resolving $brand: references) */
  brand: BrandTokens;
}

/**
 * Resolve an asset path to an absolute filesystem path.
 *
 * @throws if the path is malformed (defense in depth — schema should have caught these)
 * @throws if a $brand: reference points at a non-existent brand token
 */
export function resolveAssetPath(ctx: AssetContext, ref: string): string {
  if (ref.includes("..")) {
    throw new Error(`resolveAssetPath: path contains ".." (rejected): "${ref}"`);
  }

  if (ref.startsWith("assets/")) {
    // Per-doc asset. Join with docFolderPath using forward slashes; the
    // Tauri filesystem layer normalizes per-OS.
    return joinPath(ctx.docFolderPath, ref);
  }

  if (ref.startsWith("$brand:")) {
    // Brand reference. The token contains a relative path within the
    // shared folder, e.g. "assets/logo/primary.svg".
    const tokenPath = ref.slice("$brand:".length);     // e.g. "logo.primary"
    const resolved = resolveBrandToken<string | { svg?: string; png?: string }>(ctx.brand, tokenPath);

    // The token may be a string (a direct path) or an object with svg/png variants.
    const relativePath =
      typeof resolved === "string"
        ? resolved
        : resolved.svg ?? resolved.png;

    if (!relativePath) {
      throw new Error(`resolveAssetPath: brand token "${tokenPath}" has no usable path`);
    }
    if (relativePath.includes("..")) {
      throw new Error(`resolveAssetPath: brand token path contains ".." (rejected): "${relativePath}"`);
    }
    return joinPath(ctx.sharedFolderPath, relativePath);
  }

  throw new Error(
    `resolveAssetPath: unrecognized path scheme. ` +
    `Must start with "assets/" or "$brand:". Got: "${ref}"`,
  );
}

/**
 * Cross-platform path join. Always uses forward slashes; Tauri's fs layer
 * accepts these on Windows.
 */
function joinPath(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/\/+$/, ""))
    .filter(Boolean)
    .join("/");
}
