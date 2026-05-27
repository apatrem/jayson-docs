import { createContext, type ReactNode } from "react";
import type { BrandTokens } from "../schema/brand";

const BrandContext = createContext<BrandTokens | null>(null);

export type BrandProviderProps = {
  tokens: BrandTokens;
  children?: ReactNode;
};

export function BrandProvider({ tokens, children }: BrandProviderProps) {
  // Vite's idiomatic dev gate. `import.meta.env.DEV` is replaced at build
  // time so the production bundle drops both the branch and the error
  // string. The legacy NODE_ENV check worked only because Vite implicitly
  // replaced it; the Tauri webview has no Node `process` global at
  // runtime, and reaching for it directly would `ReferenceError` on launch.
  // See AGENTS.md §Review playbook convention #6 (Node globals in renderer).
  if (import.meta.env.DEV) {
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
