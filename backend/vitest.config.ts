
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    include: [
      "tests/**/*.{test,spec}.ts",
    ],

    exclude: [...configDefaults.exclude, "tests/e2e/**"],

    setupFiles: [
      "./tests/setup.ts",
    ],

    clearMocks: true,
    restoreMocks: true,
    testTimeout: 10000,
  },
});
