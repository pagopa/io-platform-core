import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "vite.config.mts",
        "dist",
        "node_modules",
        "**/__mocks__/**",
        "*.js",
        "src/main.ts",
        "src/scripts/generate.ts",
      ],
      reporter: ["lcov", "text"],
    },
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
