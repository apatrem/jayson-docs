import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/**
 * Vite config for the Tauri-hosted React app.
 *
 * Tauri-specific notes:
 *  - `clearScreen: false` so Tauri's logs aren't overwritten on hot reload.
 *  - `server.strictPort: true` so Tauri doesn't get a different port than
 *    it expects (Tauri reads VITE_DEV_HOST/PORT to point its webview at us).
 *  - We never bundle node built-ins — runtime FS / keychain / dialog goes
 *    through the Tauri IPC layer (see docs/TAURI_IPC.md), never through
 *    raw `fs` / `path` from JS.
 */
export default defineConfig(async () => ({
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

  // Tauri expects the dev server on a stable host/port.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: process.env["TAURI_DEV_HOST"] ?? "localhost",
    watch: {
      // Tauri rebuilds the Rust side itself; ignore that watch.
      ignored: ["**/src-tauri/**"],
    },
  },

  // Tauri target is recent Chromium / WebKit / WebView2 — we don't need
  // legacy browser support.
  build: {
    target: ["es2022", "chrome120", "safari16", "edge120"],
    minify: !process.env["TAURI_DEBUG"],
    sourcemap: !!process.env["TAURI_DEBUG"],
    rollupOptions: {
      output: {
        // Split ECharts and Mermaid out — they're large and we want PDF
        // export to be able to load them on demand.
        manualChunks: {
          echarts: ["echarts"],
          mermaid: ["mermaid"],
          tiptap: [
            "@tiptap/core",
            "@tiptap/react",
            "@tiptap/pm",
            "@tiptap/starter-kit",
          ],
        },
      },
    },
  },

  // For our schema-validated YAML loading at runtime.
  optimizeDeps: {
    include: ["yaml", "zod"],
  },
}));
