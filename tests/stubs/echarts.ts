import { vi } from "vitest";

/**
 * Lightweight stand-in for the echarts package in Vitest.
 *
 * The block registry is imported by most of the suite; any test that mounts a
 * Chart triggers `import("echarts")`, which pulls multi-MB into each isolated
 * file context. Per-file `vi.mock("echarts")` does not reliably intercept that
 * dynamic import, so this module is wired via vitest.config.ts `resolve.alias`.
 *
 * The export path also calls renderToSVGString(), so the stub returns a small
 * deterministic SVG instead of launching the real renderer in Vitest.
 */

export type EChartsOption = Record<string, unknown>;

export type ECharts = {
  setOption: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  renderToSVGString: ReturnType<typeof vi.fn>;
};

export const init = vi.fn((): ECharts => ({
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  renderToSVGString: vi.fn(
    () =>
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#fff"/></svg>',
  ),
}));
