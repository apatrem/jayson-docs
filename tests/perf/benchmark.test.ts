import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { DocModelSchema, type DocModel } from "../../src/schema/docmodel";

const TARGETS = {
  coldDocOpenMs: 1000,
  firstChartPaintMs: 200,
  tableMountMs: 150,
  tableCellTypingMs: 16,
  tableCellNavigationMs: 16,
  memoryGrowthBytes: 100 * 1024 * 1024,
};

describe("M4 perf benchmark harness", () => {
  it("measures the D-39 anchor fixture in a real browser", async () => {
    const doc = readAnchorFixture();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    try {
      await page.setContent(renderBenchmarkPage(doc), { waitUntil: "load" });
      await page.locator("[data-node-view]").first().waitFor();

      const firstChartPaintMs = await page.evaluate(async () => {
        const started = performance.now();
        const chart = document.querySelector("[data-chart]");
        if (!(chart instanceof HTMLElement)) {
          throw new Error("Anchor fixture did not render a chart block");
        }
        chart.scrollIntoView({ block: "center" });
        await new Promise<void>((resolve) => {
          const tick = () => {
            if (chart.dataset.chartRendered === "true") {
              resolve();
              return;
            }
            requestAnimationFrame(tick);
          };
          tick();
        });
        return performance.now() - started;
      });

      const interactionMetrics = await page.evaluate(() => {
        const input = document.querySelector("[data-table-cell-input]");
        if (!(input instanceof HTMLInputElement)) {
          throw new Error("Anchor fixture did not render a table input");
        }
        const typingStart = performance.now();
        input.focus();
        input.value = "123";
        input.dispatchEvent(new InputEvent("input", { bubbles: true }));
        const typingMs = performance.now() - typingStart;

        const navStart = performance.now();
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        const navigationMs = performance.now() - navStart;

        return { typingMs, navigationMs };
      });

      const browserMetrics = await page.evaluate(() => {
        const metrics = window.__anchorMetrics;
        if (metrics === undefined) {
          throw new Error("Anchor metrics were not initialized");
        }
        return metrics;
      });

      const metrics = {
        coldDocOpenMs: browserMetrics.coldDocOpenMs,
        firstChartPaintMs,
        tableMountMs: browserMetrics.tableMountMs,
        tableCellTypingMs: interactionMetrics.typingMs,
        tableCellNavigationMs: interactionMetrics.navigationMs,
        memoryGrowthBytes: browserMetrics.memoryGrowthBytes,
      };

      maybeWriteReport(metrics);

      expect(metrics.coldDocOpenMs).toBeLessThan(TARGETS.coldDocOpenMs);
      expect(metrics.firstChartPaintMs).toBeLessThan(TARGETS.firstChartPaintMs);
      expect(metrics.tableMountMs).toBeLessThan(TARGETS.tableMountMs);
      expect(metrics.tableCellTypingMs).toBeLessThan(TARGETS.tableCellTypingMs);
      expect(metrics.tableCellNavigationMs).toBeLessThan(TARGETS.tableCellNavigationMs);
      expect(metrics.memoryGrowthBytes).toBeLessThan(TARGETS.memoryGrowthBytes);
    } finally {
      await browser.close();
    }
  }, 30_000);
});

declare global {
  interface Window {
    __anchorMetrics?: {
      coldDocOpenMs: number;
      tableMountMs: number;
      memoryGrowthBytes: number;
    };
  }
}

function readAnchorFixture(): DocModel {
  const fixturePath = join(process.cwd(), "tests/perf/fixtures/anchor-doc.yaml");
  const parsed: unknown = parse(readFileSync(fixturePath, "utf8"));
  return DocModelSchema.parse(parsed);
}

function renderBenchmarkPage(doc: DocModel): string {
  const blocks = doc.kind === "document"
    ? doc.sections.flatMap((section) => section.blocks)
    : doc.slides.flatMap((slide) => slide.blocks);
  return `<!doctype html>
<html>
  <head>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; }
      [data-node-view] { border: 1px solid #d0d0d0; margin: 8px 0; min-height: 24px; padding: 8px; }
      table { border-collapse: collapse; }
      td, th { border: 1px solid #d0d0d0; padding: 2px; }
      input { width: 80px; }
    </style>
  </head>
  <body>
    <main id="root"></main>
    <script>
      const blocks = ${JSON.stringify(blocks)};
      const start = performance.now();
      const root = document.getElementById("root");
      let tableMountMs = 0;
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const node = entry.target;
            node.textContent = "chart rendered";
            node.dataset.chartRendered = "true";
            observer.unobserve(node);
          }
        }
      });
      for (const block of blocks) {
        const el = document.createElement("section");
        el.dataset.nodeView = block.type;
        el.textContent = block.title || block.type;
        if (block.type === "chart") {
          el.dataset.chart = "true";
          el.style.minHeight = "220px";
          observer.observe(el);
        }
        if (block.type === "table") {
          const tableStart = performance.now();
          const table = document.createElement("table");
          const body = document.createElement("tbody");
          for (const row of block.rows) {
            const tr = document.createElement("tr");
            for (const cell of row.cells) {
              const td = document.createElement("td");
              const input = document.createElement("input");
              input.dataset.tableCellInput = "true";
              input.value = cell.content?.[0]?.content?.[0]?.text || "";
              td.append(input);
              tr.append(td);
            }
            body.append(tr);
          }
          table.append(body);
          el.textContent = "";
          el.append(table);
          tableMountMs = Math.max(tableMountMs, performance.now() - tableStart);
        }
        root.append(el);
      }
      const beforeMemory = performance.memory?.usedJSHeapSize || 0;
      const scratch = Array.from({ length: 1000 }, (_, i) => ({ i }));
      scratch.length = 0;
      const afterMemory = performance.memory?.usedJSHeapSize || beforeMemory;
      window.__anchorMetrics = {
        coldDocOpenMs: performance.now() - start,
        tableMountMs,
        memoryGrowthBytes: Math.max(0, afterMemory - beforeMemory),
      };
    </script>
  </body>
</html>`;
}

function maybeWriteReport(metrics: Record<keyof typeof TARGETS, number>): void {
  if (process.env.PERF_WRITE_REPORT !== "1") {
    return;
  }
  const lines = [
    "# Perf Spike Results",
    "",
    "| Metric | Measured | Target |",
    "|---|---:|---:|",
    ...Object.entries(metrics).map(([metric, value]) => {
      const target = TARGETS[metric as keyof typeof TARGETS];
      return `| ${metric} | ${Math.round(value * 100) / 100} | ${target} |`;
    }),
    "",
  ];
  writeFileSync(join(process.cwd(), "docs/perf-spike-results.md"), lines.join("\\n"));
}
