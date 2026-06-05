import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    globals: false,
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@schema': fileURLToPath(new URL('./src/schema', import.meta.url)),
      '@brand': fileURLToPath(new URL('./src/brand', import.meta.url)),
      '@pipeline': fileURLToPath(new URL('./src/pipeline', import.meta.url)),
      '@llm': fileURLToPath(new URL('./src/llm', import.meta.url)),
    },
  },
});
