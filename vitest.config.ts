import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@schema": resolve(__dirname, "./src/schema"),
      "@brand": resolve(__dirname, "./src/brand-tokens"),
      "@primitives": resolve(__dirname, "./src/block-primitives"),
      "@renderer": resolve(__dirname, "./src/renderer"),
      "@editor": resolve(__dirname, "./src/editor"),
      "@llm": resolve(__dirname, "./src/llm"),
      "@docmodel": resolve(__dirname, "./src/docmodel"),
      "@setup": resolve(__dirname, "./src/setup"),
      "@ui": resolve(__dirname, "./src/ui"),
    },
  },

  test: {
    environment: "happy-dom",
    globals: false,                     // explicit imports of describe/it/expect
    // Unmount rendered components after every test so live instances (ECharts
    // charts, ResizeObservers, timers) are disposed and can't keep a worker
    // process spinning at 100% CPU. See tests/setup.ts for the full rationale.
    setupFiles: ["./tests/setup.ts"],
    // The block registry transitively imports ECharts + Mermaid (multi-MB
    // each). With the default per-file isolation these accumulate across the
    // ~145 files a worker runs until the heap hits its ~4GB ceiling and the
    // worker OOM-crashes — the constant GC then shows up as ~100% CPU and a
    // multi-minute "hang" (see the CI heap-limit crash). Raising the per-fork
    // old-space ceiling gives the finite suite enough headroom to finish.
    // (Isolation is kept on — turning it off breaks tests that rely on
    // per-file vi.mock isolation.)
    pool: "forks",
    poolOptions: {
      forks: {
        execArgv: ["--max-old-space-size=8192"],
      },
    },
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/types.ts"],
    },
  },
});
