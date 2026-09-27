import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    // mongodb-memory-server downloads and boots a real MongoDB binary, which
    // can be slow the first time it runs.
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
