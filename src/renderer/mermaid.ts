import mermaid from "mermaid";
import { resolveBrandToken } from "../brand-tokens/resolve";
import type { BrandTokens } from "../schema/brand";

let mermaidReady = false;

export function initializeMermaidTheme(brand: BrandTokens): void {
  if (mermaidReady) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: {
      primaryColor: resolveBrandToken(brand, "colors.brand.primary"),
      primaryBorderColor: resolveBrandToken(brand, "colors.semantic.border"),
      lineColor: resolveBrandToken(brand, "colors.semantic.border"),
      textColor: resolveBrandToken(brand, "colors.semantic.textPrimary"),
    },
  });
  mermaidReady = true;
}

export async function renderMermaidSvg(
  source: string,
  brand: BrandTokens,
): Promise<string> {
  initializeMermaidTheme(brand);
  const id = `mermaid-${crypto.randomUUID().replace(/-/g, "")}`;
  const { svg } = await mermaid.render(id, source);
  return svg;
}
