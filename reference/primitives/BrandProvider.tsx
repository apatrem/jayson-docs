/**
 * BrandProvider — the React context that makes brand tokens available to
 * every block renderer.
 *
 * Used by:
 *   - The main editor app (src/App.tsx) — wraps the entire UI.
 *   - The PDF export pipeline (src/export/pdf.ts) — wraps the SSR render so
 *     useBrandTokens() returns the right tokens for that document's brand.
 *   - Tests (every block test wraps the renderer in this).
 *
 * Production path: src/brand-tokens/BrandProvider.tsx
 */

import React, { createContext, useContext } from "react";
import type { BrandTokens } from "../../src/schema/brand";   // adjust path per repo

/**
 * The React context. NEVER export this directly — consumers always go through
 * the useBrandTokens hook so the "must be inside a Provider" check is uniform.
 */
const BrandContext = createContext<BrandTokens | null>(null);

export interface BrandProviderProps {
  tokens: BrandTokens;
  children: React.ReactNode;
}

export const BrandProvider: React.FC<BrandProviderProps> = ({ tokens, children }) => {
  // Validate once at provider mount (dev mode only — assume schema-validated in prod).
  if (process.env.NODE_ENV !== "production") {
    if (!tokens?.colors?.brand?.primary) {
      // Loud failure in dev — silent fall-through in prod would mask brand drift.
      // eslint-disable-next-line no-console
      console.error("BrandProvider: tokens missing required field colors.brand.primary");
    }
  }

  return <BrandContext.Provider value={tokens}>{children}</BrandContext.Provider>;
};

/**
 * Internal accessor for the hook. Consumers should always use useBrandTokens.
 */
export function _getBrandContext(): React.Context<BrandTokens | null> {
  return BrandContext;
}
