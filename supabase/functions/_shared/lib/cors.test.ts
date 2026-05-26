// supabase/functions/_shared/lib/cors.test.ts

import { assertEquals, assertExists } from '@std/assert';
import { buildCorsHeaders, corsHeaders, isAllowedOrigin } from './cors.ts';

Deno.test('isAllowedOrigin - allows workrules.eu', () => {
  assertEquals(isAllowedOrigin('https://workrules.eu'), true);
  assertEquals(isAllowedOrigin('https://www.workrules.eu'), true);
});

Deno.test('isAllowedOrigin - allows localhost dev', () => {
  assertEquals(isAllowedOrigin('http://localhost:5173'), true);
});

Deno.test('isAllowedOrigin - allows *.vercel.app previews', () => {
  assertEquals(
    isAllowedOrigin('https://workrules-git-feature-x.vercel.app'),
    true
  );
});

Deno.test('isAllowedOrigin - rejects unknown origin', () => {
  assertEquals(isAllowedOrigin('https://evil.example.com'), false);
  assertEquals(isAllowedOrigin(null), false);
});

Deno.test('buildCorsHeaders - returns allowed origin when valid', () => {
  const h = buildCorsHeaders('https://workrules.eu');
  assertEquals(h['Access-Control-Allow-Origin'], 'https://workrules.eu');
  assertEquals(h['Vary'], 'Origin');
});

Deno.test('buildCorsHeaders - falls back to canonical when origin not allowed', () => {
  const h = buildCorsHeaders('https://evil.example.com');
  assertEquals(h['Access-Control-Allow-Origin'], 'https://workrules.eu');
});

Deno.test('buildCorsHeaders - includes required headers and methods', () => {
  const h = buildCorsHeaders('https://workrules.eu');
  assertExists(h['Access-Control-Allow-Headers']);
  assertEquals(h['Access-Control-Allow-Headers'].includes('authorization'), true);
  assertEquals(h['Access-Control-Allow-Headers'].includes('content-type'), true);
  assertEquals(h['Access-Control-Allow-Headers'].includes('apikey'), true);
  assertEquals(h['Access-Control-Allow-Methods'].includes('POST'), true);
  assertEquals(h['Access-Control-Allow-Methods'].includes('OPTIONS'), true);
});

Deno.test('corsHeaders - retrocompat export exists', () => {
  assertExists(corsHeaders);
  assertEquals(typeof corsHeaders, 'object');
});
