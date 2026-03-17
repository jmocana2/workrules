/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      "@core": path.resolve(dirname, "./src/core"),
      "@ui": path.resolve(dirname, "./src/ui"),
      "@lib": path.resolve(dirname, "./src/lib"),
      "@mocks": path.resolve(dirname, "./mocks"),
      "@constants": path.resolve(dirname, "./src/constants"),
    },
  },
  test: {
    name: "unit",
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/**/*.stories.{ts,tsx}", "src/**/*.mdx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["src/**/*.stories.{ts,tsx}", "src/**/*.mdx", "src/**/*.d.ts"],
    },
  },
});
