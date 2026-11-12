import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/e2e/**/*.e2e.spec.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    sequence: { concurrent: false },
    testTimeout: 90_000,
    hookTimeout: 90_000,
    clearMocks: true,
    restoreMocks: true,
  },
});
