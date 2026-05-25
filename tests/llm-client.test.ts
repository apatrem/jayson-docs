import { describe, expect, it, vi } from "vitest";
import {
  createLlmEndpointSchema,
  LLMClient,
  LlmEndpointSchema,
  NotImplementedError,
  type LLMRequest,
  type Provider,
} from "../src/llm/client";
import { createOpenAIProvider } from "../src/llm/providers/openai";

const request: LLMRequest = {
  systemPrompt: "Return JSON only.",
  messages: [{ role: "user", content: "Draft the executive summary." }],
  responseFormat: "json",
};

describe("LLMClient (T-60)", () => {
  it("routes by endpoint provider and fetches API keys from keychain", async () => {
    const providerCall = vi.fn<Provider["call"]>(() =>
      Promise.resolve({
        content: "{\"ok\":true}",
        raw: { id: "call-1" },
        usage: { inputTokens: 11, outputTokens: 7, cachedTokens: 0 },
      }),
    );
    const fakeProvider: Provider = {
      key: "openai",
      cacheCapability: "automatic",
      call: providerCall,
      parseUsage: () => ({ inputTokens: 0, outputTokens: 0, cachedTokens: 0 }),
      validateKeyFormat: (apiKey) => {
        if (!apiKey.startsWith("sk-")) {
          throw new Error("bad key");
        }
      },
    };
    const keychain = vi.fn((name: string) => Promise.resolve(`sk-${name}`));
    const client = new LLMClient({
      config: {
        llm: {
          fastModel: {
            provider: "openai",
            model: "gpt-5.5",
            keychainEntry: "fast-key",
          },
          thinkingModel: {
            provider: "anthropic",
            model: "claude-opus-4-7",
            keychainEntry: "thinking-key",
          },
        },
      },
      keychain,
      providers: { openai: fakeProvider },
    });

    const response = await client.call("fast", request);

    expect(response.content).toBe("{\"ok\":true}");
    expect(keychain).toHaveBeenCalledWith("fast-key");
    const callInput = providerCall.mock.calls[0]?.[0];
    expect(callInput?.apiKey).toBe("sk-fast-key");
    expect(callInput?.endpoint.provider).toBe("openai");
    expect(callInput?.request).toBe(request);
  });

  it("keeps provider extension outside the client", async () => {
    const extendedEndpointSchema = createLlmEndpointSchema([
      "openai",
      "anthropic",
      "azure",
      "mistral",
      "openai-compatible",
      "local",
      "acme",
    ]);
    const acmeEndpoint = extendedEndpointSchema.parse({
      provider: "acme",
      model: "acme-fast",
      keychainEntry: "acme-key",
    });
    const acmeProvider: Provider = {
      key: "acme",
      cacheCapability: "none",
      call: () =>
        Promise.resolve({
          content: "done",
          raw: {},
          usage: { inputTokens: 1, outputTokens: 1, cachedTokens: 0 },
        }),
      parseUsage: () => ({ inputTokens: 1, outputTokens: 1, cachedTokens: 0 }),
      validateKeyFormat: () => undefined,
    };
    const client = new LLMClient({
      config: {
        llm: {
          fastModel: acmeEndpoint,
          thinkingModel: acmeEndpoint,
        },
      },
      keychain: () => Promise.resolve("acme-secret"),
      providers: { acme: acmeProvider },
    });

    await expect(client.call("fast", request)).resolves.toMatchObject({
      content: "done",
    });
  });

  it("validates baseUrl requirements for openai-compatible endpoints", () => {
    expect(() =>
      LlmEndpointSchema.parse({
        provider: "openai-compatible",
        model: "vendor-model",
        keychainEntry: "vendor-key",
      }),
    ).not.toThrow();

    const provider = createOpenAIProvider({
      key: "openai-compatible",
      baseUrl: (endpoint) => endpoint.baseUrl,
    });

    expect(() => {
      if (provider.validateEndpoint === undefined) {
        throw new Error("missing validateEndpoint");
      }
      provider.validateEndpoint({
        provider: "openai-compatible",
        model: "vendor-model",
        keychainEntry: "vendor-key",
      });
    }).toThrow(/baseUrl/);
  });

  it("posts OpenAI-shaped JSON and parses usage including cached tokens", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      Promise.resolve(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "{\"summary\":\"ok\"}" } }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 40,
            prompt_tokens_details: { cached_tokens: 25 },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
      ),
    );
    const provider = createOpenAIProvider();

    const response = await provider.call({
      apiKey: "sk-test",
      endpoint: {
        provider: "openai",
        model: "gpt-5.5",
        keychainEntry: "openai-key",
      },
      request,
      fetch: fetchImpl,
    });

    expect(response).toMatchObject({
      content: "{\"summary\":\"ok\"}",
      usage: { inputTokens: 100, outputTokens: 40, cachedTokens: 25 },
    });
    const fetchCall = fetchImpl.mock.calls[0];
    expect(fetchCall?.[0]).toBe("https://api.openai.com/v1/chat/completions");
    const fetchInit = fetchCall?.[1];
    expect(fetchInit?.method).toBe("POST");
    expect(fetchInit?.headers).toMatchObject({
      Authorization: "Bearer sk-test",
    });
  });

  it("registers explicit stubs for azure and local", async () => {
    const client = new LLMClient({
      config: {
        llm: {
          fastModel: {
            provider: "azure",
            model: "deployment-name",
            keychainEntry: "azure-key",
          },
          thinkingModel: {
            provider: "local",
            model: "llama3",
            keychainEntry: "local-key",
            baseUrl: "http://127.0.0.1:11434/v1",
          },
        },
      },
      keychain: () => Promise.resolve("stub-key"),
    });

    await expect(client.call("fast", request)).rejects.toBeInstanceOf(
      NotImplementedError,
    );
    await expect(client.call("thinking", request)).rejects.toBeInstanceOf(
      NotImplementedError,
    );
  });
});
