import { createContext, type ReactNode } from "react";
import type { BrandTokens } from "../schema/brand";

const BrandContext = createContext<BrandTokens | null>(null);

export type BrandProviderProps = {
  tokens: BrandTokens;
  children?: ReactNode;
};

export function BrandProvider({ tokens, children }: BrandProviderProps) {
  if (process.env.NODE_ENV !== "production") {
    if (!tokens.colors.brand.primary) {
      console.error(
        "BrandProvider: tokens missing required field colors.brand.primary",
      );
    }
  }

  return (
    <BrandContext.Provider value={tokens}>{children}</BrandContext.Provider>
  );
}

export function _getBrandContext(): typeof BrandContext {
  return BrandContext;
}
