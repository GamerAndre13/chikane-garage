import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.STAGING_BASE_URL;

if (!baseURL) {
  throw new Error("Define STAGING_BASE_URL para executar os testes E2E.");
}

const staging = new URL(baseURL);
const productionHosts = new Set(["chikanegarage.blog", "www.chikanegarage.blog"]);

if (staging.protocol !== "https:" || productionHosts.has(staging.hostname.toLowerCase())) {
  throw new Error("Os testes E2E só podem correr num endereço HTTPS de staging, nunca em produção.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["junit", { outputFile: "test-results/e2e-junit.xml" }]]
    : "list",
  outputDir: "test-results/playwright",
  use: {
    baseURL: staging.toString().replace(/\/$/, ""),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
});
