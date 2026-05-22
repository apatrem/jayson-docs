import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { FC, ReactElement } from "react";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import {
  DEFAULT_RENDER_BUDGET_MS,
  withRenderWatchdog,
} from "../../src/block-primitives/RenderWatchdog";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brandTokens = parse(
  readFileSync(join(repoRoot, "brand.example.yaml"), "utf8"),
) as Parameters<typeof BrandProvider>[0]["tokens"];

const FastBlock: FC<{ label: string }> = ({ label }) => <span>{label}</span>;

const HeavyBlock: FC = () => {
  const sink: number[] = [];
  const deadline = performance.now() + DEFAULT_RENDER_BUDGET_MS + 30;
  while (performance.now() < deadline) {
    sink.push(sink.length);
  }
  return <span data-heavy="1">{sink.length}</span>;
};

function renderWithBrand(ui: ReactElement) {
  return render(
    <BrandProvider tokens={brandTokens}>{ui}</BrandProvider>,
  );
}

describe("withRenderWatchdog", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders benign blocks with negligible wrapper overhead", () => {
    const Wrapped = withRenderWatchdog(FastBlock, { budgetMs: 50 });
    const t0 = performance.now();
    renderWithBrand(<Wrapped label="ok" />);
    const overhead = performance.now() - t0;
    expect(screen.getByText("ok")).toBeTruthy();
    expect(overhead).toBeLessThan(50);
  });

  it("replaces a slow block with the render-budget placeholder", async () => {
    const Wrapped = withRenderWatchdog(HeavyBlock, { budgetMs: 5 });
    renderWithBrand(<Wrapped />);
    const alert = await screen.findByRole("alert");
    expect(alert.getAttribute("data-render-failed")).toBe(
      "render-budget-exceeded",
    );
    expect(screen.queryByText("ok")).toBeNull();
  });
});
