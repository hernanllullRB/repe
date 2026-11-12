import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: { PGLITE_DIR: "memory", AI_PROVIDER: "mock", YOUTUBE_API_KEY: "test-key" },
    testTimeout: 30000,
  },
});
