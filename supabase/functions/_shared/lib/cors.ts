const ALLOWED_ORIGINS = [
  'https://workrules.eu',
  'https://www.workrules.eu',
  'http://localhost:5173',
  'http://localhost:3000'
];

const ALLOWED_ORIGIN_PATTERNS = [/^https:\/\/[a-z0-9-]+\.vercel\.app$/];

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

export function buildCorsHeaders(
  origin: string | null
): Record<string, string> {
  const allowOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    Vary: 'Origin',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, baggage, sentry-trace',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

// Retrocompat: algunos consumidores antiguos importan el objeto estático.
// Devuelve headers con el origin canónico (workrules.eu).
export const corsHeaders = buildCorsHeaders(null);
