/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import { storybookTest } from "@storybook/experimental-addon-test/vitest-plugin";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    storybookTest({
      configDir: ".storybook",
      storybookScript: "pnpm storybook --ci",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      "@core": path.resolve(dirname, "./src/core"),
      "@ui": path.resolve(dirname, "./src/ui"),
      "@lib": path.resolve(dirname, "./src/lib"),
    },
  },
  test: {
    name: "storybook",
    browser: {
      enabled: true,
      name: "chromium",
      provider: "playwright",
      headless: true,
    },
    setupFiles: [".storybook/vitest.setup.ts"],
    include: ["src/**/*.stories.?(m)[jt]s?(x)"],
  },
});
