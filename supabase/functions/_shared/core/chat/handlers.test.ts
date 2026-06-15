// supabase/functions/_shared/core/chat/handlers.test.ts

import { assertEquals, assertExists } from '@std/assert';
import {
  validateChatRequest,
  parseRequestBody,
  processChatRequest,
  buildErrorResponse,
} from './handlers.ts';

// ============================================
// validateChatRequest
// ============================================

Deno.test('validateChatRequest - valid request with required fields', () => {
  const result = validateChatRequest({
    convenio_id: '66499',
    pregunta: '¿Cuántos días de vacaciones?',
  });

  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test('validateChatRequest - valid request with optional fields', () => {
  const result = validateChatRequest({
    convenio_id: '66499',
    pregunta: '¿Cuál es el salario base?',
    variables: { categoria: 'Camarera' },
    session_id: 'test-session',
    stream: true,
  });

  assertEquals(result.valid, true);
});

Deno.test('validateChatRequest - rejects null body', () => {
  const result = validateChatRequest(null);

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Invalid request body');
});

Deno.test('validateChatRequest - rejects undefined body', () => {
  const result = validateChatRequest(undefined);

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Invalid request body');
});

Deno.test('validateChatRequest - rejects non-object body', () => {
  const result = validateChatRequest('string');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Invalid request body');
});

Deno.test('validateChatRequest - rejects missing convenio_id', () => {
  const result = validateChatRequest({
    pregunta: '¿Cuántos días de vacaciones?',
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing required fields');
  assertEquals(result.fields, ['convenio_id']);
});

Deno.test('validateChatRequest - rejects missing pregunta', () => {
  const result = validateChatRequest({
    convenio_id: '66499',
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing required fields');
  assertEquals(result.fields, ['pregunta']);
});

Deno.test('validateChatRequest - rejects missing both required fields', () => {
  const result = validateChatRequest({});

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing required fields');
  assertEquals(result.fields?.length, 2);
  assertEquals(result.fields?.includes('convenio_id'), true);
  assertEquals(result.fields?.includes('pregunta'), true);
});

Deno.test('validateChatRequest - rejects non-string convenio_id', () => {
  const result = validateChatRequest({
    convenio_id: 12345,
    pregunta: '¿Cuántos días de vacaciones?',
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'convenio_id must be a string');
});

Deno.test('validateChatRequest - rejects non-string pregunta', () => {
  const result = validateChatRequest({
    convenio_id: '66499',
    pregunta: 123,
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'pregunta must be a string');
});

Deno.test('validateChatRequest - rejects pregunta shorter than 3 chars', () => {
  const result = validateChatRequest({
    convenio_id: '66499',
    pregunta: 'ab',
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'pregunta must be at least 3 characters');
});

Deno.test('validateChatRequest - rejects pregunta with only whitespace', () => {
  const result = validateChatRequest({
    convenio_id: '66499',
    pregunta: '   ',
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'pregunta must be at least 3 characters');
});

// ============================================
// parseRequestBody
// ============================================

Deno.test('parseRequestBody - parses valid JSON', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ convenio_id: '123', pregunta: 'test' }),
  });

  const result = await parseRequestBody(request);

  assertEquals(result.error, undefined);
  assertExists(result.data);
  assertEquals((result.data as Record<string, unknown>).convenio_id, '123');
});

Deno.test('parseRequestBody - returns error for invalid JSON', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: 'not valid json',
  });

  const result = await parseRequestBody(request);

  assertEquals(result.data, null);
  assertEquals(result.error, 'Invalid JSON body');
});

Deno.test('parseRequestBody - returns error for empty body', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: '',
  });

  const result = await parseRequestBody(request);

  assertEquals(result.data, null);
  assertEquals(result.error, 'Invalid JSON body');
});

// ============================================
// processChatRequest
// ============================================

Deno.test('processChatRequest - returns 200 with correct structure', () => {
  const result = processChatRequest({
    convenio_id: '66499',
    pregunta: '¿Cuántos días de vacaciones?',
  });

  assertEquals(result.status, 200);
  assertEquals(result.body.status, 'ok');
  assertExists(result.body.data);
});

Deno.test('processChatRequest - includes convenio_id in response', () => {
  const result = processChatRequest({
    convenio_id: '66499',
    pregunta: '¿Cuántos días de vacaciones?',
  });

  const data = result.body.data as Record<string, unknown>;
  assertEquals(data.convenio_id, '66499');
});

Deno.test('processChatRequest - includes pregunta in response', () => {
  const result = processChatRequest({
    convenio_id: '66499',
    pregunta: '¿Cuántos días de vacaciones?',
  });

  const data = result.body.data as Record<string, unknown>;
  assertEquals(data.pregunta, '¿Cuántos días de vacaciones?');
});

// ============================================
// buildErrorResponse
// ============================================

Deno.test('buildErrorResponse - returns correct status', () => {
  const result = buildErrorResponse(400, 'Bad request');

  assertEquals(result.status, 400);
});

Deno.test('buildErrorResponse - includes error message', () => {
  const result = buildErrorResponse(400, 'Bad request');

  assertEquals(result.body.error, 'Bad request');
});

Deno.test('buildErrorResponse - includes additional details', () => {
  const result = buildErrorResponse(400, 'Missing fields', {
    required: ['field1', 'field2'],
  });

  assertEquals(result.body.error, 'Missing fields');
  assertEquals(result.body.required, ['field1', 'field2']);
});

Deno.test('buildErrorResponse - 404 error', () => {
  const result = buildErrorResponse(404, 'Convenio not found');

  assertEquals(result.status, 404);
  assertEquals(result.body.error, 'Convenio not found');
});

Deno.test('buildErrorResponse - 500 error', () => {
  const result = buildErrorResponse(500, 'Internal server error');

  assertEquals(result.status, 500);
  assertEquals(result.body.error, 'Internal server error');
});

// ============================================
// mapResultToHttpResponse (I2.8)
// ============================================

import { mapResultToHttpResponse, type ChatUseCaseResult } from './handlers.ts';

Deno.test('mapResultToHttpResponse - success returns 200 with respuesta', () => {
  const result: ChatUseCaseResult = {
    type: 'success',
    response: 'El salario base es de 1500 euros.',
    metadata: {
      cacheHit: false,
      chunksUsed: 3,
      model: 'claude-sonnet-4-5',
      latencyMs: 1200,
    },
    citations: [
      { articulo: 'Art. 24', seccion: null, chunk_id: 'chunk-1', relevance_score: 0.92, url_pdf: null, pagina: null },
    ],
  };

  const response = mapResultToHttpResponse(result);

  assertEquals(response.status, 200);
  assertEquals(response.body.status, 'ok');
  assertEquals(response.body.respuesta, 'El salario base es de 1500 euros.');
  assertEquals((response.body.metadata as Record<string, unknown>).classification, 'general');
});

Deno.test('mapResultToHttpResponse - salary_calculated returns 200 with desglose', () => {
  const result: ChatUseCaseResult = {
    type: 'salary_calculated',
    response: 'El salario bruto mensual es de 1800 euros.',
    metadata: {
      cacheHit: false,
      chunksUsed: 4,
      model: 'claude-sonnet-4-5',
      latencyMs: 1500,
      variablesUsadas: { categoria: 'Camarero' },
    },
    citations: [],
    desglose: {
      conceptos: [{ nombre: 'Salario Base', importe: 1500 }],
      totalBruto: 1800,
    },
  };

  const response = mapResultToHttpResponse(result);

  assertEquals(response.status, 200);
  assertEquals(response.body.status, 'ok');
  assertEquals((response.body.metadata as Record<string, unknown>).classification, 'salary');
  assertEquals((response.body.desglose as Record<string, unknown>).totalBruto, 1800);
});

Deno.test('mapResultToHttpResponse - cache_hit returns 200', () => {
  const result: ChatUseCaseResult = {
    type: 'cache_hit',
    response: 'Respuesta cacheada',
    metadata: {
      cacheHit: true,
      chunksUsed: 0,
      model: 'cache',
      latencyMs: 50,
    },
    citations: [],
  };

  const response = mapResultToHttpResponse(result);

  assertEquals(response.status, 200);
  assertEquals(response.body.status, 'ok');
  assertEquals((response.body.metadata as Record<string, unknown>).cache_hit, true);
});

Deno.test('mapResultToHttpResponse - incomplete_data returns 200 with incomplete status', () => {
  const result: ChatUseCaseResult = {
    type: 'incomplete_data',
    message: 'Necesito saber tu categoria profesional',
    missingVariables: ['categoria'],
    suggestions: { categoria: ['Camarero', 'Recepcionista', 'Gobernanta'] },
  };

  const response = mapResultToHttpResponse(result);

  assertEquals(response.status, 200);
  assertEquals(response.body.status, 'incomplete');
  assertEquals(response.body.respuesta, 'Necesito saber tu categoria profesional');
  assertEquals(response.body.missingVariables, ['categoria']);
});

Deno.test('mapResultToHttpResponse - invalid_data returns 400', () => {
  const result: ChatUseCaseResult = {
    type: 'invalid_data',
    message: 'El maximo legal de horas extra es 80/ano',
    invalidVariables: [
      { name: 'horasExtra', reason: 'Supera limite legal', value: 100 },
    ],
  };

  const response = mapResultToHttpResponse(result);

  assertEquals(response.status, 400);
  assertEquals(response.body.status, 'error');
  assertEquals(response.body.error, 'El maximo legal de horas extra es 80/ano');
});

Deno.test('mapResultToHttpResponse - quota_exceeded returns 429', () => {
  const result: ChatUseCaseResult = {
    type: 'quota_exceeded',
    message: 'Has alcanzado el limite de consultas',
  };

  const response = mapResultToHttpResponse(result);

  assertEquals(response.status, 429);
  assertEquals(response.body.status, 'error');
  assertEquals(response.body.error, 'Has alcanzado el limite de consultas');
});

Deno.test('mapResultToHttpResponse - not_found returns 404', () => {
  const result: ChatUseCaseResult = {
    type: 'not_found',
    message: 'Convenio con ID xyz no encontrado',
  };

  const response = mapResultToHttpResponse(result);

  assertEquals(response.status, 404);
  assertEquals(response.body.status, 'error');
  assertEquals(response.body.error, 'Convenio con ID xyz no encontrado');
});

Deno.test('mapResultToHttpResponse - error returns 500 with code', () => {
  const result: ChatUseCaseResult = {
    type: 'error',
    message: 'Error al procesar la pregunta',
    code: 'EMBEDDING_RATE_LIMIT',
  };

  const response = mapResultToHttpResponse(result);

  assertEquals(response.status, 500);
  assertEquals(response.body.status, 'error');
  assertEquals(response.body.error, 'Error al procesar la pregunta');
  assertEquals(response.body.code, 'EMBEDDING_RATE_LIMIT');
});

Deno.test('mapResultToHttpResponse - stream type returns error (should not be mapped)', () => {
  const result: ChatUseCaseResult = {
    type: 'stream',
    stream: new ReadableStream(),
    citations: [],
    cleanup: async () => {},
  };

  const response = mapResultToHttpResponse(result);

  assertEquals(response.status, 200);
  assertEquals(response.body.status, 'error');
});

// ============================================
// extractUserIdFromRequest (I2.8)
// ============================================

import { extractUserIdFromRequest } from './handlers.ts';

Deno.test('extractUserIdFromRequest - returns null if no Authorization header', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  const result = await extractUserIdFromRequest(request);

  assertEquals(result, null);
});

Deno.test('extractUserIdFromRequest - returns null for empty Bearer token', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' },
    body: JSON.stringify({}),
  });

  const result = await extractUserIdFromRequest(request);

  assertEquals(result, null);
});

Deno.test('extractUserIdFromRequest - returns null without SUPABASE_URL env', async () => {
  // Guardar valor original
  const originalUrl = Deno.env.get('SUPABASE_URL');
  const originalKey = Deno.env.get('SUPABASE_ANON_KEY');

  try {
    // Limpiar env
    Deno.env.delete('SUPABASE_URL');
    Deno.env.delete('SUPABASE_ANON_KEY');

    const request = new Request('http://localhost', {
      method: 'POST',
      headers: { Authorization: 'Bearer some-token' },
      body: JSON.stringify({}),
    });

    const result = await extractUserIdFromRequest(request);

    assertEquals(result, null);
  } finally {
    // Restaurar env
    if (originalUrl) Deno.env.set('SUPABASE_URL', originalUrl);
    if (originalKey) Deno.env.set('SUPABASE_ANON_KEY', originalKey);
  }
});
