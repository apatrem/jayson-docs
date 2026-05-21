/**
 * useBrandTokens — the canonical hook to access brand tokens from any
 * block renderer or UI component.
 *
 * Throws if called outside a <BrandProvider>. This is intentional: a renderer
 * that runs without brand context cannot produce brand-consistent output, so
 * a loud failure beats silent drift.
 *
 * Production path: src/brand-tokens/useBrandTokens.ts
 */

import { useContext } from "react";
import { _getBrandContext } from "./BrandProvider";
import type { BrandTokens } from "../../src/schema/brand";

export function useBrandTokens(): BrandTokens {
  const tokens = useContext(_getBrandContext());
  if (!tokens) {
    throw new Error(
      "useBrandTokens() called outside <BrandProvider>. " +
      "Wrap your component tree in <BrandProvider tokens={...}>."
    );
  }
  return tokens;
}
