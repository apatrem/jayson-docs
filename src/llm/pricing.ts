export interface PricingRate {
  inputPer1k: number;
  cachedInputPer1k: number;
  outputPer1k: number;
}

export type PricingSource = "lookup" | "adapter-default" | "config-fallback";

export const Pricing: Record<string, PricingRate> = {
  "openai:gpt-5.5": {
    inputPer1k: 0.01,
    cachedInputPer1k: 0.001,
    outputPer1k: 0.03,
  },
  "anthropic:claude-opus-4-7": {
    inputPer1k: 0.015,
    cachedInputPer1k: 0.0015,
    outputPer1k: 0.075,
  },
  "mistral:mistral-large-latest": {
    inputPer1k: 0.004,
    cachedInputPer1k: 0.0004,
    outputPer1k: 0.012,
  },
};

export function computeLlmCostUsd(
  usage: { inputTokens: number; outputTokens: number; cachedTokens: number },
  rate: PricingRate,
): number {
  const cachedInputTokens = Math.min(usage.cachedTokens, usage.inputTokens);
  const uncachedInputTokens = usage.inputTokens - cachedInputTokens;
  return (
    (uncachedInputTokens / 1000) * rate.inputPer1k +
    (cachedInputTokens / 1000) * rate.cachedInputPer1k +
    (usage.outputTokens / 1000) * rate.outputPer1k
  );
}
