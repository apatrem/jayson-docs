import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COST_LEDGER_COLUMNS,
  costLedgerPath,
  CostLedgerRowSchema,
  openCostLedger,
  type CostLedgerRow,
} from "../../src/cost-ledger/db";

const exampleRow: CostLedgerRow = {
  id: "11111111-1111-4111-8111-111111111111",
  timestamp: "2026-05-25T09:00:00Z",
  model: "gpt-5.5",
  provider: "openai",
  inputTokens: 1200,
  outputTokens: 240,
  cachedTokens: 800,
  computedCostUsd: 0.0124,
  docId: "22222222-2222-4222-8222-222222222222",
  callKind: "comment-batch",
};

describe("cost ledger SQLite setup (T-67)", () => {
  it("creates cost.db under the app config directory", () => {
    withTempLedger((configDir) => {
      const ledger = openCostLedger(configDir);
      try {
        expect(existsSync(costLedgerPath(configDir))).toBe(true);
      } finally {
        ledger.close();
      }
    });
  });

  it("migrates only cost-computation columns", () => {
    withTempLedger((configDir) => {
      const ledger = openCostLedger(configDir);
      try {
        expect(ledger.tableColumns()).toEqual([...COST_LEDGER_COLUMNS]);
        const columns = ledger.tableColumns().join(" ");
        expect(columns).not.toMatch(/prompt|response|content|behavior|accept/i);
      } finally {
        ledger.close();
      }
    });
  });

  it("inserts and reads rows matching CostLedgerRowSchema", () => {
    withTempLedger((configDir) => {
      const ledger = openCostLedger(configDir);
      try {
        ledger.insertRow(exampleRow);
        const rows = ledger.listRows();
        expect(rows).toEqual([exampleRow]);
        expect(CostLedgerRowSchema.safeParse(rows[0]).success).toBe(true);
      } finally {
        ledger.close();
      }
    });
  });
});

function withTempLedger(run: (configDir: string) => void): void {
  const configDir = mkdtempSync(join(tmpdir(), "cost-ledger-"));
  try {
    run(configDir);
  } finally {
    rmSync(configDir, { recursive: true, force: true });
  }
}
