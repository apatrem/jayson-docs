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
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/types.ts"],
    },
  },
});
