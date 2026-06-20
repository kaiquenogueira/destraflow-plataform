import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    include: ["**/*.test.{ts,tsx}"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./__mocks__/server-only.ts"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "src/generated/**",
        "__mocks__/**",
        "**/*.test.{ts,tsx}",
        "**/*.config.{ts,mjs}",
        "src/types/**",
      ],
      // Ratchet: piso abaixo da cobertura atual (stmts 75.8 / branch 57.3 / funcs 83 / lines 77.2).
      // Trava regressão sem quebrar o CI; suba à medida que a cobertura crescer.
      thresholds: {
        statements: 70,
        branches: 52,
        functions: 78,
        lines: 72,
      },
    },
  },
});
