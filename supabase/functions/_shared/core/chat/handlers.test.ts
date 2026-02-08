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
