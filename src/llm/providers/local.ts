import {
  NotImplementedError,
  type BaseLlmEndpoint,
  type LLMUsage,
  type Provider,
} from "../client";

export function createLocalProvider(): Provider {
  return {
    key: "local",
    cacheCapability: "none",
    validateEndpoint: (endpoint: BaseLlmEndpoint) => {
      if (endpoint.baseUrl === undefined || endpoint.baseUrl.length === 0) {
        throw new NotImplementedError("Local LLM endpoint requires baseUrl.");
      }
    },
    validateKeyFormat: () => undefined,
    parseUsage: (): LLMUsage => ({
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
    }),
    call: () =>
      Promise.reject(
        new NotImplementedError(
          "Local LLM adapter is registered but not implemented yet.",
        ),
      ),
  };
}
