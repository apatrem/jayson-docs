import type { CostLedgerRow } from "./db";

export interface CostSummary {
  currentMonth: {
    totalUsd: number;
    callCount: number;
    limitUsd: number;
    pctOfLimit: number;
  };
  rolling30Days: {
    totalUsd: number;
    callCount: number;
  };
  perDoc: Array<{ docId: string; totalUsd: number; callCount: number }>;
}

export interface CostLimitConfig {
  enabled: boolean;
  monthlyUsdSoft: number;
  monthlyUsdHard: number;
  allowAdminOverride: boolean;
}

export type MonthlyLimitStatus = "disabled" | "ok" | "warning" | "blocked";

export interface MonthlyLimitDecision {
  status: MonthlyLimitStatus;
  canCall: boolean;
  warning: boolean;
  totalUsd: number;
  hardLimitUsd: number;
  pctOfHardLimit: number;
  reason?: string;
}

export function summarizeCostRows(
  rows: CostLedgerRow[],
  config: Pick<CostLimitConfig, "monthlyUsdHard">,
  now: Date = new Date(),
): CostSummary {
  const monthPrefix = now.toISOString().slice(0, 7);
  const rollingCutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const currentMonthRows = rows.filter((row) =>
    row.timestamp.startsWith(monthPrefix),
  );
  const rollingRows = rows.filter(
    (row) => new Date(row.timestamp).getTime() >= rollingCutoff,
  );
  const currentTotal = sumCost(currentMonthRows);
  return {
    currentMonth: {
      totalUsd: currentTotal,
      callCount: currentMonthRows.length,
      limitUsd: config.monthlyUsdHard,
      pctOfLimit:
        config.monthlyUsdHard <= 0 ? 1 : currentTotal / config.monthlyUsdHard,
    },
    rolling30Days: {
      totalUsd: sumCost(rollingRows),
      callCount: rollingRows.length,
    },
    perDoc: summarizePerDoc(rows),
  };
}

export function evaluateMonthlyLimit(
  summary: CostSummary,
  config: CostLimitConfig,
  options: { adminOverride?: boolean } = {},
): MonthlyLimitDecision {
  const totalUsd = summary.currentMonth.totalUsd;
  const hardLimitUsd = config.monthlyUsdHard;
  const pctOfHardLimit = hardLimitUsd <= 0 ? 1 : totalUsd / hardLimitUsd;

  if (!config.enabled) {
    return {
      status: "disabled",
      canCall: true,
      warning: false,
      totalUsd,
      hardLimitUsd,
      pctOfHardLimit,
    };
  }

  if (totalUsd >= hardLimitUsd) {
    if (config.allowAdminOverride && options.adminOverride === true) {
      return {
        status: "warning",
        canCall: true,
        warning: true,
        totalUsd,
        hardLimitUsd,
        pctOfHardLimit,
        reason: "Admin override active.",
      };
    }
    return {
      status: "blocked",
      canCall: false,
      warning: true,
      totalUsd,
      hardLimitUsd,
      pctOfHardLimit,
      reason: "Monthly hard limit reached.",
    };
  }

  if (totalUsd >= config.monthlyUsdSoft * 0.8) {
    return {
      status: "warning",
      canCall: true,
      warning: true,
      totalUsd,
      hardLimitUsd,
      pctOfHardLimit,
      reason: "Monthly spend has reached the warning threshold.",
    };
  }

  return {
    status: "ok",
    canCall: true,
    warning: false,
    totalUsd,
    hardLimitUsd,
    pctOfHardLimit,
  };
}

export function evaluateRowsAgainstMonthlyLimit(
  rows: CostLedgerRow[],
  config: CostLimitConfig,
  options: { now?: Date; adminOverride?: boolean } = {},
): MonthlyLimitDecision {
  const evaluateOptions =
    options.adminOverride === undefined
      ? {}
      : { adminOverride: options.adminOverride };
  return evaluateMonthlyLimit(
    summarizeCostRows(rows, config, options.now),
    config,
    evaluateOptions,
  );
}

function sumCost(rows: CostLedgerRow[]): number {
  return rows.reduce((sum, row) => sum + row.computedCostUsd, 0);
}

function summarizePerDoc(
  rows: CostLedgerRow[],
): Array<{ docId: string; totalUsd: number; callCount: number }> {
  const perDoc = new Map<string, { totalUsd: number; callCount: number }>();
  for (const row of rows) {
    if (row.docId === undefined) {
      continue;
    }
    const current = perDoc.get(row.docId) ?? { totalUsd: 0, callCount: 0 };
    current.totalUsd += row.computedCostUsd;
    current.callCount += 1;
    perDoc.set(row.docId, current);
  }
  return [...perDoc.entries()].map(([docId, aggregate]) => ({
    docId,
    ...aggregate,
  }));
}
