import { afterEach, describe, it, expect, vi } from "vitest";
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

const ThrowingBlock: FC = () => {
  throw new Error("block exploded");
};

const ThrowOnFlagBlock: FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error("triggered throw");
  return <span>before throw</span>;
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

  it("catches a block that throws synchronously on render", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const Wrapped = withRenderWatchdog(ThrowingBlock, { budgetMs: 50, catchErrors: true });
    renderWithBrand(<Wrapped />);

    const alert = await screen.findByRole("alert");
    expect(alert.getAttribute("data-render-failed")).toBe("render-threw");
    expect(alert.textContent).toContain("block exploded");

    consoleError.mockRestore();
  });

  it("catches a block that throws on a subsequent render after passing initially", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const Wrapped = withRenderWatchdog(ThrowOnFlagBlock, { budgetMs: 50, catchErrors: true });
    const { rerender } = renderWithBrand(<Wrapped shouldThrow={false} />);
    expect(screen.getByText("before throw")).toBeTruthy();

    rerender(
      <BrandProvider tokens={brandTokens}>
        <Wrapped shouldThrow={true} />
      </BrandProvider>,
    );

    const alert = await screen.findByRole("alert");
    expect(alert.getAttribute("data-render-failed")).toBe("render-threw");
    expect(alert.textContent).toContain("triggered throw");

    consoleError.mockRestore();
  });
});
