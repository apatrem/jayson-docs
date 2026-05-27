/**
 * Tests for T-176: cost-ledger authored-block-generation category.
 *
 * Verifies:
 *   - The `authored-block-generation` callKind is accepted by the schema and DB.
 *   - Migration from a v1 database (without the new call_kind) preserves
 *     existing rows and accepts the new category afterwards.
 *   - D-32 content-exclusion invariant holds for authored-block-generation calls
 *     (no prompt or response content stored in any SQLite field).
 */

import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
  CostLedgerDb,
  CostLedgerRowSchema,
  migrateCostLedger,
} from "../../src/cost-ledger/db";
import { LLMClient, type LLMRequest, type Provider } from "../../src/llm/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withMemoryLedger(
  run: (db: Database.Database, ledger: CostLedgerDb) => void,
): void {
  const db = new Database(":memory:");
  migrateCostLedger(db);
  const ledger = new CostLedgerDb(db);
  try {
    run(db, ledger);
  } finally {
    ledger.close();
  }
}

/** Builds a v1 database without authored-block-generation in the CHECK constraint. */
function buildV1Database(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE cost_ledger (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      model TEXT NOT NULL,
      provider TEXT NOT NULL,
      input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),
      output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),
      cached_tokens INTEGER NOT NULL CHECK (cached_tokens >= 0),
      computed_cost_usd REAL NOT NULL CHECK (computed_cost_usd >= 0),
      doc_id TEXT,
      call_kind TEXT NOT NULL CHECK (
        call_kind IN ('generation', 'comment-batch', 'comment-single', 'setup')
      ),
      pricing_source TEXT NOT NULL CHECK (
        pricing_source IN ('lookup', 'adapter-default', 'config-fallback')
      )
    )
  `);
  return db;
}

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

function successProvider(): Provider {
  return {
    key: "openai",
    cacheCapability: "automatic",
    validateKeyFormat: () => undefined,
    parseUsage: () => ({ inputTokens: 0, outputTokens: 0, cachedTokens: 0 }),
    call: () =>
      Promise.resolve({
        content: '{"ok":true}',
        raw: {},
        usage: { inputTokens: 500, cachedTokens: 50, outputTokens: 120 },
      }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("cost-ledger authored-block-generation category (T-176)", () => {
  it("CostLedgerRowSchema accepts authored-block-generation callKind", () => {
    const result = CostLedgerRowSchema.safeParse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      timestamp: "2026-05-27T10:00:00Z",
      model: "claude-opus-4-7",
      provider: "anthropic",
      inputTokens: 2000,
      outputTokens: 800,
      cachedTokens: 400,
      computedCostUsd: 0.046,
      docId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      callKind: "authored-block-generation",
      pricingSource: "lookup",
    });
    expect(result.success).toBe(true);
  });

  it("inserts and retrieves an authored-block-generation row from the ledger", () => {
    withMemoryLedger((_db, ledger) => {
      const row = {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        timestamp: "2026-05-27T10:00:00Z",
        model: "claude-opus-4-7",
        provider: "anthropic",
        inputTokens: 2000,
        outputTokens: 800,
        cachedTokens: 400,
        computedCostUsd: 0.046,
        docId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        callKind: "authored-block-generation" as const,
        pricingSource: "lookup" as const,
      };

      ledger.insertRow(row);
      const rows = ledger.listRows();

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        callKind: "authored-block-generation",
        model: "claude-opus-4-7",
        inputTokens: 2000,
        outputTokens: 800,
      });
    });
  });

  it("migrates a v1 database: preserves old rows and accepts new category", () => {
    const db = buildV1Database();
    // Insert a row in the old schema format.
    db.prepare(
      `INSERT INTO cost_ledger VALUES (
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        '2026-05-27T09:00:00Z', 'gpt-5.5', 'openai',
        100, 25, 10, 0.0015, NULL, 'comment-batch', 'lookup'
      )`,
    ).run();

    // Run the current migration against the v1 db.
    migrateCostLedger(db);
    const ledger = new CostLedgerDb(db);

    try {
      // Old row survived the migration.
      const rows = ledger.listRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ callKind: "comment-batch" });

      // New category is accepted by the migrated schema.
      ledger.insertRow({
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        timestamp: "2026-05-27T10:00:00Z",
        model: "claude-opus-4-7",
        provider: "anthropic",
        inputTokens: 1500,
        outputTokens: 600,
        cachedTokens: 300,
        computedCostUsd: 0.034,
        callKind: "authored-block-generation",
        pricingSource: "lookup",
      });

      const updated = ledger.listRows();
      expect(updated).toHaveLength(2);
      expect(
        updated.some((r) => r.callKind === "authored-block-generation"),
      ).toBe(true);
    } finally {
      ledger.close();
    }
  });

  it("running migrateCostLedger twice on the same db is idempotent", () => {
    const db = new Database(":memory:");
    migrateCostLedger(db);
    // Should not throw on second call (user_version guard prevents table recreation).
    expect(() => migrateCostLedger(db)).not.toThrow();
    db.close();
  });

  it("authored-block-generation calls are logged via LLMClient", async () => {
    const db = new Database(":memory:");
    migrateCostLedger(db);
    const ledger = new CostLedgerDb(db);

    const request: LLMRequest = {
      messages: [{ role: "user", content: "Generate a competitive matrix" }],
      cost: {
        docId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        callKind: "authored-block-generation",
      },
    };

    const client = new LLMClient({
      config: configFor("openai", "gpt-5.5"),
      keychain: () => Promise.resolve("sk-test"),
      providers: { openai: successProvider() },
      costLedger: ledger,
      now: () => new Date("2026-05-27T10:00:00Z"),
    });

    try {
      await client.call("codegen", request);

      const rows = ledger.listRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        callKind: "authored-block-generation",
        model: "gpt-5.5",
        provider: "openai",
        inputTokens: 500,
        outputTokens: 120,
        cachedTokens: 50,
      });
    } finally {
      ledger.close();
      db.close();
    }
  });

  it("D-32: no prompt or response content stored for authored-block-generation calls", async () => {
    const PROMPT_SENTINEL = "NEVER_STORE_PROMPT_T176";
    const RESPONSE_SENTINEL = "NEVER_STORE_RESPONSE_T176";

    const db = new Database(":memory:");
    migrateCostLedger(db);
    const ledger = new CostLedgerDb(db);

    const provider: Provider = {
      key: "openai",
      cacheCapability: "automatic",
      validateKeyFormat: () => undefined,
      parseUsage: () => ({ inputTokens: 0, outputTokens: 0, cachedTokens: 0 }),
      call: () =>
        Promise.resolve({
          content: `${RESPONSE_SENTINEL}-output`,
          raw: { output: `${RESPONSE_SENTINEL}-raw` },
          usage: { inputTokens: 800, cachedTokens: 200, outputTokens: 300 },
        }),
    };

    const client = new LLMClient({
      config: configFor("openai", "gpt-5.5"),
      keychain: () => Promise.resolve("sk-test"),
      providers: { openai: provider },
      costLedger: ledger,
      now: () => new Date("2026-05-27T10:00:00Z"),
    });

    try {
      await client.call("codegen", {
        systemPrompt: `${PROMPT_SENTINEL}-system`,
        cachedContexts: [
          { kind: "docContext", content: `${PROMPT_SENTINEL}-context` },
        ],
        messages: [{ role: "user", content: `${PROMPT_SENTINEL}-message` }],
        cost: {
          docId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          callKind: "authored-block-generation",
        },
      });

      const rawRows = db.prepare("SELECT * FROM cost_ledger").all();
      expect(rawRows).toHaveLength(1);
      const searchable = JSON.stringify(rawRows);
      expect(searchable).not.toContain(PROMPT_SENTINEL);
      expect(searchable).not.toContain(RESPONSE_SENTINEL);
    } finally {
      ledger.close();
      db.close();
    }
  });
});
