import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { CostLedgerDb, migrateCostLedger } from "../src/cost-ledger/db";
import { LLMClient, type LLMRequest, type Provider } from "../src/llm/client";

const PROMPT_SENTINEL = "NEVER_STORE_PROMPT_TEXT";
const RESPONSE_SENTINEL = "NEVER_STORE_RESPONSE_TEXT";

describe("cost ledger content exclusion (T-72)", () => {
  it("never records prompt or response content in any SQLite field", async () => {
    const db = new Database(":memory:");
    migrateCostLedger(db);
    const ledger = new CostLedgerDb(db);
    const client = new LLMClient({
      config: configFor("openai", "gpt-5.5"),
      keychain: () => Promise.resolve("sk-test"),
      providers: { openai: sentinelProvider() },
      costLedger: ledger,
      now: () => new Date("2026-05-25T10:00:00Z"),
    });

    try {
      for (let index = 0; index < 10; index += 1) {
        await client.call("fast", sentinelRequest(index));
      }

      const rawRows = db.prepare("SELECT * FROM cost_ledger").all();
      expect(rawRows).toHaveLength(10);
      for (const rawRow of rawRows) {
        const searchable = JSON.stringify(rawRow);
        expect(searchable).not.toContain(PROMPT_SENTINEL);
        expect(searchable).not.toContain(RESPONSE_SENTINEL);
      }
    } finally {
      ledger.close();
    }
  });
});

function sentinelRequest(index: number): LLMRequest {
  return {
    systemPrompt: `${PROMPT_SENTINEL}-system-${index}`,
    cachedContexts: [
      {
        kind: "docContext",
        content: `${PROMPT_SENTINEL}-cached-context-${index}`,
      },
    ],
    messages: [
      { role: "user", content: `${PROMPT_SENTINEL}-message-${index}` },
      { role: "assistant", content: `${RESPONSE_SENTINEL}-prior-${index}` },
    ],
    responseFormat: "json",
    cost: {
      docId: "33333333-3333-4333-8333-333333333333",
      callKind: "comment-single",
    },
  };
}

function sentinelProvider(): Provider {
  return {
    key: "openai",
    cacheCapability: "automatic",
    validateKeyFormat: () => undefined,
    parseUsage: () => ({ inputTokens: 0, outputTokens: 0, cachedTokens: 0 }),
    call: () =>
      Promise.resolve({
        content: `${RESPONSE_SENTINEL}-generated`,
        raw: { output: `${RESPONSE_SENTINEL}-raw` },
        usage: { inputTokens: 100, outputTokens: 25, cachedTokens: 10 },
      }),
  };
}

function configFor(provider: string, model: string) {
  const endpoint = { provider, model, keychainEntry: `${provider}-key` };
  return {
    llm: {
      fastModel: endpoint,
      thinkingModel: endpoint,
    },
  };
}
