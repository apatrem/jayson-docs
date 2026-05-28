import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { init } from "echarts";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { defaultBrand } from "../../src/brand/defaultBrand";
import { Chart } from "../../src/blocks/chart";
import type { ChartBlock } from "../../src/blocks/chart/schema";

const block: ChartBlock = {
  id: "chart-live-test",
  type: "chart",
  chartType: "bar",
  title: "Revenue by Quarter",
  data: {
    series: [{ name: "Revenue", values: [100, 120, 90, 150] }],
    xLabels: ["Q1", "Q2", "Q3", "Q4"],
  },
  palette: "qualitative",
  showLegend: true,
  legendPosition: "bottom",
  showDataLabels: false,
};

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("Chart live renderer", () => {
  afterEach(() => {
    cleanup();
    vi.mocked(init).mockClear();
    vi.restoreAllMocks();
  });

  it("does not initialize canvas ECharts when the DOM has no canvas context", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => null,
    );

    render(
      <BrandProvider tokens={defaultBrand}>
        <Chart block={block} />
      </BrandProvider>,
    );
    await nextTick();

    expect(init).not.toHaveBeenCalled();
  });
});
