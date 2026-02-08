// supabase/functions/_shared/lib/cors.test.ts

import { assertEquals, assertExists } from '@std/assert';
import { corsHeaders } from './cors.ts';

Deno.test('corsHeaders - exists and is an object', () => {
  assertExists(corsHeaders);
  assertEquals(typeof corsHeaders, 'object');
});

Deno.test('corsHeaders - has Access-Control-Allow-Origin', () => {
  assertExists(corsHeaders['Access-Control-Allow-Origin']);
  assertEquals(corsHeaders['Access-Control-Allow-Origin'], '*');
});

Deno.test('corsHeaders - has Access-Control-Allow-Headers', () => {
  assertExists(corsHeaders['Access-Control-Allow-Headers']);
  // Debe incluir headers necesarios para Supabase
  const headers = corsHeaders['Access-Control-Allow-Headers'];
  assertEquals(headers.includes('authorization'), true);
  assertEquals(headers.includes('content-type'), true);
  assertEquals(headers.includes('apikey'), true);
});

Deno.test('corsHeaders - has Access-Control-Allow-Methods', () => {
  assertExists(corsHeaders['Access-Control-Allow-Methods']);
  const methods = corsHeaders['Access-Control-Allow-Methods'];
  assertEquals(methods.includes('POST'), true);
  assertEquals(methods.includes('OPTIONS'), true);
});

Deno.test('corsHeaders - can be spread into Response headers', () => {
  const response = new Response('ok', { headers: corsHeaders });

  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
});
