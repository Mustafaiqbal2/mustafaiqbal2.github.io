import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["worker/test/**/*.{test,spec}.{ts,mjs}", "tests/**/*.{test,spec}.ts"],
    clearMocks: true
  }
});
