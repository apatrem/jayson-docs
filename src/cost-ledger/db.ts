import Database, { type Database as SqliteDatabase } from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const COST_DB_FILENAME = "cost.db";

export const CostLedgerRowSchema = z
  .object({
    id: z.string().uuid(),
    timestamp: z.string().datetime(),
    model: z.string(),
    provider: z.string(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cachedTokens: z.number().int().nonnegative(),
    computedCostUsd: z.number().nonnegative(),
    docId: z.string().uuid().optional(),
    callKind: z.enum(["generation", "comment-batch", "comment-single", "setup"]),
  })
  .strict();

export type CostLedgerRow = z.infer<typeof CostLedgerRowSchema>;

export const COST_LEDGER_COLUMNS = [
  "id",
  "timestamp",
  "model",
  "provider",
  "input_tokens",
  "output_tokens",
  "cached_tokens",
  "computed_cost_usd",
  "doc_id",
  "call_kind",
] as const;

interface CostLedgerRowRecord {
  id: string;
  timestamp: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  computed_cost_usd: number;
  doc_id: string | null;
  call_kind: CostLedgerRow["callKind"];
}

interface TableInfoRow {
  name: string;
}

export function costLedgerPath(configDir: string): string {
  return join(configDir, COST_DB_FILENAME);
}

export function openCostLedger(configDir: string): CostLedgerDb {
  mkdirSync(configDir, { recursive: true });
  const db = new Database(costLedgerPath(configDir));
  migrateCostLedger(db);
  return new CostLedgerDb(db);
}

export function migrateCostLedger(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cost_ledger (
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
      )
    );

    CREATE INDEX IF NOT EXISTS idx_cost_ledger_timestamp
      ON cost_ledger (timestamp);
    CREATE INDEX IF NOT EXISTS idx_cost_ledger_doc_id
      ON cost_ledger (doc_id);
  `);
}

export class CostLedgerDb {
  constructor(private readonly db: SqliteDatabase) {}

  insertRow(input: CostLedgerRow): void {
    const row = CostLedgerRowSchema.parse(input);
    this.db
      .prepare(
        `
          INSERT INTO cost_ledger (
            id,
            timestamp,
            model,
            provider,
            input_tokens,
            output_tokens,
            cached_tokens,
            computed_cost_usd,
            doc_id,
            call_kind
          ) VALUES (
            @id,
            @timestamp,
            @model,
            @provider,
            @input_tokens,
            @output_tokens,
            @cached_tokens,
            @computed_cost_usd,
            @doc_id,
            @call_kind
          )
        `,
      )
      .run(toRecord(row));
  }

  listRows(): CostLedgerRow[] {
    const records = this.db
      .prepare("SELECT * FROM cost_ledger ORDER BY timestamp ASC, id ASC")
      .all() as CostLedgerRowRecord[];
    return records.map(fromRecord);
  }

  tableColumns(): string[] {
    const rows = this.db
      .prepare("PRAGMA table_info(cost_ledger)")
      .all() as TableInfoRow[];
    return rows.map((row) => row.name);
  }

  close(): void {
    this.db.close();
  }
}

function toRecord(row: CostLedgerRow): CostLedgerRowRecord {
  return {
    id: row.id,
    timestamp: row.timestamp,
    model: row.model,
    provider: row.provider,
    input_tokens: row.inputTokens,
    output_tokens: row.outputTokens,
    cached_tokens: row.cachedTokens,
    computed_cost_usd: row.computedCostUsd,
    doc_id: row.docId ?? null,
    call_kind: row.callKind,
  };
}

function fromRecord(record: CostLedgerRowRecord): CostLedgerRow {
  const row = {
    id: record.id,
    timestamp: record.timestamp,
    model: record.model,
    provider: record.provider,
    inputTokens: record.input_tokens,
    outputTokens: record.output_tokens,
    cachedTokens: record.cached_tokens,
    computedCostUsd: record.computed_cost_usd,
    callKind: record.call_kind,
    ...(record.doc_id === null ? {} : { docId: record.doc_id }),
  };
  return CostLedgerRowSchema.parse(row);
}
