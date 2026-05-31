/// <reference types="vitest/config" />
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

// https://vite.dev/config/
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
const dirname = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      filename: "dist/stats.html",
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
    }),
    // Solo se activa si las vars estan presentes (build de produccion en CI/Vercel).
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
      })]
      : []),
  ],
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
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react/jsx-runtime"],
          radix: [
            "@radix-ui/react-collapsible",
            "@radix-ui/react-popover",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-use-controllable-state",
          ],
          tanstack: ["@tanstack/react-query"],
          supabase: ["@supabase/supabase-js"],
          ai: ["ai", "@ai-sdk/react"],
        },
      },
    },
  },
  test: {
    projects: [{
      extends: true,
      plugins: [
        // The plugin will run tests for the stories defined in your Storybook config
        // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
        storybookTest({
          configDir: path.join(dirname, ".storybook"),
        }),
      ],
      test: {
        name: "storybook",
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: "chromium",
          }],
        },
        setupFiles: [".storybook/vitest.setup.ts"],
      },
    }],
  },
});
