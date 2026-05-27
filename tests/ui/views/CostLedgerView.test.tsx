/**
 * Tests for T-177: per-category breakdown in the "My LLM Spend" view,
 * specifically verifying that the `authored-block-generation` category is
 * visible alongside the existing callKind categories.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CostLedgerRow } from "../../../src/cost-ledger/db";
import type { CostSummary } from "../../../src/cost-ledger/limits";
import { CostLedgerView } from "../../../src/ui/settings/CostLedgerView";

afterEach(() => {
  cleanup();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const EMPTY_SUMMARY: CostSummary = {
  currentMonth: { totalUsd: 0, callCount: 0, limitUsd: 50, pctOfLimit: 0 },
  rolling30Days: { totalUsd: 0, callCount: 0 },
  perDoc: [],
};

function makeRow(
  callKind: CostLedgerRow["callKind"],
  computedCostUsd: number,
  docId?: string,
): CostLedgerRow {
  return {
    id: crypto.randomUUID(),
    timestamp: "2026-05-27T10:00:00Z",
    model: "claude-opus-4-7",
    provider: "anthropic",
    inputTokens: 100,
    outputTokens: 50,
    cachedTokens: 0,
    computedCostUsd,
    docId,
    callKind,
    pricingSource: "lookup",
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CostLedgerView — per-category breakdown (T-177)", () => {
  it("renders a 'By category' section heading", () => {
    render(
      <CostLedgerView
        rows={[makeRow("authored-block-generation", 1.5)]}
        summary={EMPTY_SUMMARY}
        onClearHistory={() => void 0}
        confirmClear={() => false}
      />,
    );
    expect(screen.getByText("By category")).toBeTruthy();
  });

  it("shows 'Authored block generation' label for authored-block-generation rows", () => {
    render(
      <CostLedgerView
        rows={[makeRow("authored-block-generation", 1.5)]}
        summary={EMPTY_SUMMARY}
        onClearHistory={() => void 0}
        confirmClear={() => false}
      />,
    );
    expect(screen.getByText("Authored block generation")).toBeTruthy();
  });

  it("shows the formatted cost for authored-block-generation category", () => {
    render(
      <CostLedgerView
        rows={[makeRow("authored-block-generation", 2.5)]}
        summary={EMPTY_SUMMARY}
        onClearHistory={() => void 0}
        confirmClear={() => false}
      />,
    );
    // Multiple elements may show "$2.50" (category row + table row); any match is sufficient.
    expect(screen.getAllByText(/\$2\.50/).length).toBeGreaterThan(0);
  });

  it("shows the call count for a category", () => {
    render(
      <CostLedgerView
        rows={[
          makeRow("authored-block-generation", 1.0),
          makeRow("authored-block-generation", 2.0),
        ]}
        summary={EMPTY_SUMMARY}
        onClearHistory={() => void 0}
        confirmClear={() => false}
      />,
    );
    expect(screen.getByText(/2 calls/)).toBeTruthy();
  });

  it("shows human-readable labels for existing categories", () => {
    render(
      <CostLedgerView
        rows={[
          makeRow("comment-batch", 0.5),
          makeRow("generation", 1.0),
          makeRow("setup", 0.1),
        ]}
        summary={EMPTY_SUMMARY}
        onClearHistory={() => void 0}
        confirmClear={() => false}
      />,
    );
    expect(screen.getByText("Comment batch")).toBeTruthy();
    expect(screen.getByText("Document generation")).toBeTruthy();
    expect(screen.getByText("Workspace setup")).toBeTruthy();
  });

  it("lists multiple categories when multiple callKinds are present", () => {
    render(
      <CostLedgerView
        rows={[
          makeRow("authored-block-generation", 3.0),
          makeRow("comment-batch", 0.5),
          makeRow("generation", 1.0),
        ]}
        summary={EMPTY_SUMMARY}
        onClearHistory={() => void 0}
        confirmClear={() => false}
      />,
    );
    expect(screen.getByText("Authored block generation")).toBeTruthy();
    expect(screen.getByText("Comment batch")).toBeTruthy();
    expect(screen.getByText("Document generation")).toBeTruthy();
  });

  it("sorts categories by cost descending (highest first)", () => {
    const { container } = render(
      <CostLedgerView
        rows={[
          makeRow("comment-batch", 0.5),
          makeRow("authored-block-generation", 3.0),
          makeRow("generation", 1.0),
        ]}
        summary={EMPTY_SUMMARY}
        onClearHistory={() => void 0}
        confirmClear={() => false}
      />,
    );

    // "Authored block generation" ($3.00) should appear before "Document generation" ($1.00).
    const allText = container.textContent ?? "";
    const abgIdx = allText.indexOf("Authored block generation");
    const genIdx = allText.indexOf("Document generation");
    expect(abgIdx).toBeGreaterThan(-1);
    expect(genIdx).toBeGreaterThan(-1);
    expect(abgIdx).toBeLessThan(genIdx);
  });

  it("shows fallback text when no rows are recorded", () => {
    render(
      <CostLedgerView
        rows={[]}
        summary={EMPTY_SUMMARY}
        onClearHistory={() => void 0}
        confirmClear={() => false}
      />,
    );
    expect(screen.getByText("No category costs recorded yet.")).toBeTruthy();
  });

  it("shows 'call' singular when a category has exactly 1 call", () => {
    render(
      <CostLedgerView
        rows={[makeRow("authored-block-generation", 1.0)]}
        summary={EMPTY_SUMMARY}
        onClearHistory={() => void 0}
        confirmClear={() => false}
      />,
    );
    expect(screen.getByText(/1 call(?!s)/)).toBeTruthy();
  });
});
