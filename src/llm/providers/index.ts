import type { BaseLlmEndpoint, Provider } from "../client";
import { createAnthropicProvider } from "./anthropic";
import { createAzureProvider } from "./azure";
import { createLocalProvider } from "./local";
import { createMistralProvider } from "./mistral";
import { createOpenAIProvider } from "./openai";
import { createOpenAICompatibleProvider } from "./openai-compatible";

export const defaultProviders: Record<string, Provider<BaseLlmEndpoint>> = {
  openai: createOpenAIProvider(),
  anthropic: createAnthropicProvider(),
  azure: createAzureProvider(),
  mistral: createMistralProvider(),
  "openai-compatible": createOpenAICompatibleProvider(),
  local: createLocalProvider(),
};
