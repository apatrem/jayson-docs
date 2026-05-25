import { describe, expect, it } from "vitest";
import type { CostLedgerRow } from "../../src/cost-ledger/db";
import {
  evaluateMonthlyLimit,
  evaluateRowsAgainstMonthlyLimit,
  summarizeCostRows,
  type CostLimitConfig,
  type CostSummary,
} from "../../src/cost-ledger/limits";

const config: CostLimitConfig = {
  enabled: true,
  monthlyUsdSoft: 50,
  monthlyUsdHard: 50,
  allowAdminOverride: true,
};

describe("monthly cost limit enforcement (T-69)", () => {
  it("returns ok below the 80% warning threshold", () => {
    const decision = evaluateMonthlyLimit(summaryWithCurrentSpend(39.99), config);

    expect(decision).toMatchObject({
      status: "ok",
      canCall: true,
      warning: false,
    });
  });

  it("returns a warning at or above 80% of the soft limit", () => {
    const decision = evaluateMonthlyLimit(summaryWithCurrentSpend(40), config);

    expect(decision).toMatchObject({
      status: "warning",
      canCall: true,
      warning: true,
    });
  });

  it("blocks calls at the hard limit without an override", () => {
    const decision = evaluateMonthlyLimit(summaryWithCurrentSpend(50), config);

    expect(decision).toMatchObject({
      status: "blocked",
      canCall: false,
      warning: true,
      reason: "Monthly hard limit reached.",
    });
  });

  it("allows calls at the hard limit with an admin override", () => {
    const decision = evaluateMonthlyLimit(summaryWithCurrentSpend(50), config, {
      adminOverride: true,
    });

    expect(decision).toMatchObject({
      status: "warning",
      canCall: true,
      warning: true,
      reason: "Admin override active.",
    });
  });

  it("disables enforcement when cost tracking is disabled", () => {
    const decision = evaluateMonthlyLimit(summaryWithCurrentSpend(500), {
      ...config,
      enabled: false,
    });

    expect(decision).toMatchObject({
      status: "disabled",
      canCall: true,
      warning: false,
    });
  });

  it("summarizes current-month rows before evaluating limits", () => {
    const rows: CostLedgerRow[] = [
      row("2026-05-01T10:00:00Z", 20, "doc-a"),
      row("2026-05-15T10:00:00Z", 21, "doc-a"),
      row("2026-04-15T10:00:00Z", 100, "doc-b"),
    ];
    const summary = summarizeCostRows(rows, config, new Date("2026-05-25T00:00:00Z"));

    expect(summary.currentMonth).toMatchObject({
      totalUsd: 41,
      callCount: 2,
      pctOfLimit: 0.82,
    });
    expect(summary.perDoc).toContainEqual({
      docId: "doc-a",
      totalUsd: 41,
      callCount: 2,
    });
    expect(
      evaluateRowsAgainstMonthlyLimit(rows, config, {
        now: new Date("2026-05-25T00:00:00Z"),
      }).status,
    ).toBe("warning");
  });
});

function summaryWithCurrentSpend(totalUsd: number): CostSummary {
  return {
    currentMonth: {
      totalUsd,
      callCount: 1,
      limitUsd: 50,
      pctOfLimit: totalUsd / 50,
    },
    rolling30Days: { totalUsd, callCount: 1 },
    perDoc: [],
  };
}

function row(timestamp: string, computedCostUsd: number, docId: string): CostLedgerRow {
  return {
    id: crypto.randomUUID(),
    timestamp,
    model: "gpt-5.5",
    provider: "openai",
    inputTokens: 1,
    outputTokens: 1,
    cachedTokens: 0,
    computedCostUsd,
    docId,
    callKind: "comment-batch",
    pricingSource: "lookup",
  };
}
