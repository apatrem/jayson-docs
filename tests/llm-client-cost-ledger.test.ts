import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openCostLedger } from "../src/cost-ledger/db";
import {
  LLMClient,
  LLMProviderError,
  type LLMRequest,
  type Provider,
} from "../src/llm/client";

const baseRequest: LLMRequest = {
  messages: [{ role: "user", content: "Sentinel prompt must not be stored" }],
  cost: {
    docId: "33333333-3333-4333-8333-333333333333",
    callKind: "comment-batch",
  },
};

describe("LLM client cost ledger insertion (T-68)", () => {
  it("inserts one computed-cost row after a successful call", async () => {
    await withLedger(async (ledger) => {
      const client = new LLMClient({
        config: configFor("openai", "gpt-5.5"),
        keychain: () => Promise.resolve("sk-test"),
        providers: { openai: successProvider("openai") },
        costLedger: ledger,
        now: () => new Date("2026-05-25T09:00:00Z"),
      });

      await client.call("fast", baseRequest);

      expect(ledger.listRows()).toMatchObject([
        {
          model: "gpt-5.5",
          provider: "openai",
          inputTokens: 1000,
          cachedTokens: 250,
          outputTokens: 100,
          computedCostUsd: 0.01075,
          pricingSource: "lookup",
          callKind: "comment-batch",
        },
      ]);
    });
  });

  it("inserts a zero-output row for failed provider calls", async () => {
    await withLedger(async (ledger) => {
      const client = new LLMClient({
        config: configFor("openai", "gpt-5.5"),
        keychain: () => Promise.resolve("sk-test"),
        providers: { openai: failingProvider("openai") },
        costLedger: ledger,
        now: () => new Date("2026-05-25T09:00:00Z"),
      });

      await expect(client.call("fast", baseRequest)).rejects.toThrow(
        LLMProviderError,
      );

      expect(ledger.listRows()[0]).toMatchObject({
        model: "gpt-5.5",
        provider: "openai",
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        computedCostUsd: 0,
        pricingSource: "lookup",
      });
    });
  });

  it("uses config fallback pricing for unpriced openai-compatible models", async () => {
    await withLedger(async (ledger) => {
      const client = new LLMClient({
        config: {
          ...configFor("openai-compatible", "lightning/llama-3.1-70b"),
          costLimits: {
            fallbackPricingPer1k: {
              inputUsd: 0.02,
              cachedInputUsd: 0.002,
              outputUsd: 0.04,
            },
          },
        },
        keychain: () => Promise.resolve("vendor-key"),
        providers: {
          "openai-compatible": successProvider("openai-compatible"),
        },
        costLedger: ledger,
        now: () => new Date("2026-05-25T09:00:00Z"),
      });

      await client.call("fast", baseRequest);

      expect(ledger.listRows()[0]).toMatchObject({
        model: "lightning/llama-3.1-70b",
        provider: "openai-compatible",
        computedCostUsd: 0.0195,
        pricingSource: "config-fallback",
      });
    });
  });
});

function configFor(provider: string, model: string) {
  const endpoint = { provider, model, keychainEntry: `${provider}-key` };
  return {
    llm: {
      fastModel: endpoint,
      thinkingModel: endpoint,
      codegenModel: endpoint,
    },
  };
}

function successProvider(key: string): Provider {
  return {
    key,
    cacheCapability: "automatic",
    validateKeyFormat: () => undefined,
    parseUsage: () => ({ inputTokens: 0, outputTokens: 0, cachedTokens: 0 }),
    call: () =>
      Promise.resolve({
        content: "{\"ok\":true}",
        raw: {},
        usage: { inputTokens: 1000, cachedTokens: 250, outputTokens: 100 },
      }),
  };
}

function failingProvider(key: string): Provider {
  return {
    key,
    cacheCapability: "automatic",
    validateKeyFormat: () => undefined,
    parseUsage: () => ({ inputTokens: 0, outputTokens: 0, cachedTokens: 0 }),
    call: () =>
      Promise.reject(new LLMProviderError("provider failed", key)),
  };
}

async function withLedger(
  run: (ledger: ReturnType<typeof openCostLedger>) => Promise<void>,
): Promise<void> {
  const configDir = mkdtempSync(join(tmpdir(), "llm-cost-"));
  const ledger = openCostLedger(configDir);
  try {
    await run(ledger);
  } finally {
    ledger.close();
    rmSync(configDir, { recursive: true, force: true });
  }
}
