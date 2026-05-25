import type { Database as SqliteDatabase } from "better-sqlite3";

export const COST_LEDGER_RETENTION_MONTHS = 13;
export const COST_LEDGER_PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

type IntervalHandle = ReturnType<typeof setInterval>;
type SetIntervalLike = (handler: () => void, timeout: number) => IntervalHandle;
type ClearIntervalLike = (handle: IntervalHandle) => void;

export function costLedgerRetentionCutoff(
  now: Date = new Date(),
  retentionMonths = COST_LEDGER_RETENTION_MONTHS,
): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCMonth(cutoff.getUTCMonth() - retentionMonths);
  return cutoff;
}

export function pruneCostLedgerRows(
  db: SqliteDatabase,
  now: Date = new Date(),
): number {
  const cutoff = costLedgerRetentionCutoff(now).toISOString();
  const result = db
    .prepare("DELETE FROM cost_ledger WHERE timestamp < ?")
    .run(cutoff);
  return result.changes;
}

export function pruneCostLedgerOnLaunch(
  db: SqliteDatabase,
  now: Date = new Date(),
): number {
  return pruneCostLedgerRows(db, now);
}

export function scheduleCostLedgerPruning(
  db: SqliteDatabase,
  options: {
    intervalMs?: number;
    now?: () => Date;
    setIntervalFn?: SetIntervalLike;
    clearIntervalFn?: ClearIntervalLike;
  } = {},
): () => void {
  const intervalMs = options.intervalMs ?? COST_LEDGER_PRUNE_INTERVAL_MS;
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;
  const timer = setIntervalFn(() => {
    pruneCostLedgerRows(db, options.now?.() ?? new Date());
  }, intervalMs);

  return () => {
    clearIntervalFn(timer);
  };
}
