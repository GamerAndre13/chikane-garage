import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    reporters: process.env.CI
      ? ["default", ["junit", { outputFile: "test-results/unit-junit.xml" }]]
      : ["default"],
  },
});
