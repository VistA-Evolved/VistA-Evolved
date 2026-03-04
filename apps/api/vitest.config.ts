import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 15_000,
    include: ['tests/**/*.test.ts'],
    exclude: ['src/**/*.test.ts'], // node:test files (logger, redaction) — run via `node --test`
    sequence: { concurrent: false },
    fileParallelism: false,
    reporters: ['verbose', 'json'],
    outputFile: {
      json: 'test-results.json',
    },
  },
});
