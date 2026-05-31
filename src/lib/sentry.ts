import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  const isProd = import.meta.env.PROD;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: isProd ? 0.1 : 1.0,
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/.*\.supabase\.co\/functions\//,
    ],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
  });
}

export { Sentry };
