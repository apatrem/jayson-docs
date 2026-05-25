import { createOpenAIProvider } from "./openai";

export function createOpenAICompatibleProvider() {
  return createOpenAIProvider({
    key: "openai-compatible",
    baseUrl: (endpoint) => endpoint.baseUrl,
  });
}
