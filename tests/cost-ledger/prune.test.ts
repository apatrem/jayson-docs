import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";
import {
  CostLedgerDb,
  type CostLedgerRow,
  migrateCostLedger,
} from "../../src/cost-ledger/db";
import {
  costLedgerRetentionCutoff,
  pruneCostLedgerRows,
  scheduleCostLedgerPruning,
} from "../../src/cost-ledger/prune";

describe("cost ledger retention pruning (T-70)", () => {
  it("deletes rows older than the 13-month sliding window", () => {
    const db = new Database(":memory:");
    migrateCostLedger(db);
    const ledger = new CostLedgerDb(db);
    ledger.insertRow(row("11111111-1111-4111-8111-111111111111", "2025-04-24T00:00:00Z"));
    ledger.insertRow(row("22222222-2222-4222-8222-222222222222", "2025-04-25T00:00:00Z"));
    ledger.insertRow(row("33333333-3333-4333-8333-333333333333", "2026-05-25T00:00:00Z"));

    const deleted = pruneCostLedgerRows(db, new Date("2026-05-25T00:00:00Z"));

    expect(deleted).toBe(1);
    expect(ledger.listRows().map((entry) => entry.id)).toEqual([
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ]);
    ledger.close();
  });

  it("computes the cutoff in UTC calendar months", () => {
    expect(
      costLedgerRetentionCutoff(new Date("2026-05-25T00:00:00Z")).toISOString(),
    ).toBe("2025-04-25T00:00:00.000Z");
  });

  it("schedules nightly pruning and returns a cancel function", () => {
    const db = new Database(":memory:");
    migrateCostLedger(db);
    const timer = Symbol("timer") as unknown as ReturnType<typeof setInterval>;
    const setIntervalFn = vi.fn((handler: () => void, _timeout: number) => {
      void handler;
      return timer;
    });
    const clearIntervalFn = vi.fn(
      (_handle: ReturnType<typeof setInterval>) => undefined,
    );

    const cancel = scheduleCostLedgerPruning(db, {
      intervalMs: 10,
      now: () => new Date("2026-05-25T00:00:00Z"),
      setIntervalFn,
      clearIntervalFn,
    });

    expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 10);
    cancel();
    expect(clearIntervalFn).toHaveBeenCalledTimes(1);
    db.close();
  });
});

function row(id: string, timestamp: string): CostLedgerRow {
  return {
    id,
    timestamp,
    model: "gpt-5.5",
    provider: "openai",
    inputTokens: 1,
    outputTokens: 1,
    cachedTokens: 0,
    computedCostUsd: 1,
    callKind: "generation",
    pricingSource: "lookup",
  };
}
