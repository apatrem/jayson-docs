import { useContext } from "react";
import { _getBrandContext } from "./BrandProvider";
import type { BrandTokens } from "../schema/brand";

export function useBrandTokens(): BrandTokens {
  const tokens = useContext(_getBrandContext());
  if (!tokens) {
    throw new Error(
      "useBrandTokens() called outside <BrandProvider>. " +
        "Wrap your component tree in <BrandProvider tokens={...}>.",
    );
  }
  return tokens;
}
