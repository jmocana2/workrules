// supabase/functions/webhook-pdf/handlers.test.ts

import { assertEquals, assertExists } from '@std/assert';
import {
  validateWebhookPayload,
  isPdfFile,
  extractConvenioId,
  buildNotImplementedResponse,
  buildWebhookErrorResponse,
} from './handlers.ts';

// ============================================
// validateWebhookPayload
// ============================================

Deno.test('validateWebhookPayload - valid INSERT payload', () => {
  const result = validateWebhookPayload({
    type: 'INSERT',
    table: 'objects',
    record: {
      id: '123',
      name: 'test.pdf',
      bucket_id: 'convenios',
    },
  });

  assertEquals(result.valid, true);
  assertExists(result.payload);
  assertEquals(result.payload?.type, 'INSERT');
});

Deno.test('validateWebhookPayload - valid UPDATE payload', () => {
  const result = validateWebhookPayload({
    type: 'UPDATE',
    table: 'objects',
    record: {
      id: '123',
      name: 'test.pdf',
      bucket_id: 'convenios',
    },
  });

  assertEquals(result.valid, true);
  assertEquals(result.payload?.type, 'UPDATE');
});

Deno.test('validateWebhookPayload - valid DELETE payload', () => {
  const result = validateWebhookPayload({
    type: 'DELETE',
    table: 'objects',
    record: {
      id: '123',
      name: 'test.pdf',
      bucket_id: 'convenios',
    },
  });

  assertEquals(result.valid, true);
  assertEquals(result.payload?.type, 'DELETE');
});

Deno.test('validateWebhookPayload - rejects null', () => {
  const result = validateWebhookPayload(null);

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Invalid payload');
});

Deno.test('validateWebhookPayload - rejects missing type', () => {
  const result = validateWebhookPayload({
    table: 'objects',
    record: { id: '123', name: 'test.pdf' },
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing type field');
});

Deno.test('validateWebhookPayload - rejects invalid type', () => {
  const result = validateWebhookPayload({
    type: 'INVALID',
    table: 'objects',
    record: { id: '123', name: 'test.pdf' },
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Invalid type value');
});

Deno.test('validateWebhookPayload - rejects missing record', () => {
  const result = validateWebhookPayload({
    type: 'INSERT',
    table: 'objects',
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing record field');
});

Deno.test('validateWebhookPayload - rejects record without id', () => {
  const result = validateWebhookPayload({
    type: 'INSERT',
    table: 'objects',
    record: { name: 'test.pdf' },
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Invalid record structure');
});

Deno.test('validateWebhookPayload - rejects record without name', () => {
  const result = validateWebhookPayload({
    type: 'INSERT',
    table: 'objects',
    record: { id: '123' },
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Invalid record structure');
});

// ============================================
// isPdfFile
// ============================================

Deno.test('isPdfFile - returns true for .pdf', () => {
  assertEquals(isPdfFile('document.pdf'), true);
});

Deno.test('isPdfFile - returns true for .PDF (uppercase)', () => {
  assertEquals(isPdfFile('document.PDF'), true);
});

Deno.test('isPdfFile - returns true for .Pdf (mixed case)', () => {
  assertEquals(isPdfFile('document.Pdf'), true);
});

Deno.test('isPdfFile - returns false for .txt', () => {
  assertEquals(isPdfFile('document.txt'), false);
});

Deno.test('isPdfFile - returns false for .docx', () => {
  assertEquals(isPdfFile('document.docx'), false);
});

Deno.test('isPdfFile - returns false for file without extension', () => {
  assertEquals(isPdfFile('document'), false);
});

Deno.test('isPdfFile - returns false for .pdf in middle of name', () => {
  assertEquals(isPdfFile('pdf.document.txt'), false);
});

Deno.test('isPdfFile - handles path with directories', () => {
  assertEquals(isPdfFile('convenios/66499/documento.pdf'), true);
});

// ============================================
// extractConvenioId
// ============================================

Deno.test('extractConvenioId - extracts from valid path', () => {
  const result = extractConvenioId('convenios/66499/documento.pdf');

  assertEquals(result, '66499');
});

Deno.test('extractConvenioId - handles nested paths', () => {
  const result = extractConvenioId('convenios/12345/2024/v1/documento.pdf');

  assertEquals(result, '12345');
});

Deno.test('extractConvenioId - returns null for invalid path structure', () => {
  const result = extractConvenioId('other/66499/documento.pdf');

  assertEquals(result, null);
});

Deno.test('extractConvenioId - returns null for root file', () => {
  const result = extractConvenioId('documento.pdf');

  assertEquals(result, null);
});

Deno.test('extractConvenioId - returns null for single directory', () => {
  const result = extractConvenioId('convenios');

  assertEquals(result, null);
});

// ============================================
// buildNotImplementedResponse
// ============================================

Deno.test('buildNotImplementedResponse - returns 501 status', () => {
  const result = buildNotImplementedResponse();

  assertEquals(result.status, 501);
});

Deno.test('buildNotImplementedResponse - has not_implemented status', () => {
  const result = buildNotImplementedResponse();

  assertEquals(result.body.status, 'not_implemented');
});

Deno.test('buildNotImplementedResponse - includes message', () => {
  const result = buildNotImplementedResponse();

  assertExists(result.body.message);
  assertEquals(typeof result.body.message, 'string');
});

// ============================================
// buildWebhookErrorResponse
// ============================================

Deno.test('buildWebhookErrorResponse - returns correct status', () => {
  const result = buildWebhookErrorResponse(400, 'Bad request');

  assertEquals(result.status, 400);
});

Deno.test('buildWebhookErrorResponse - includes error message', () => {
  const result = buildWebhookErrorResponse(400, 'Bad request');

  assertEquals(result.body.error, 'Bad request');
});

Deno.test('buildWebhookErrorResponse - 404 error', () => {
  const result = buildWebhookErrorResponse(404, 'Not found');

  assertEquals(result.status, 404);
  assertEquals(result.body.error, 'Not found');
});

Deno.test('buildWebhookErrorResponse - 500 error', () => {
  const result = buildWebhookErrorResponse(500, 'Internal error');

  assertEquals(result.status, 500);
  assertEquals(result.body.error, 'Internal error');
});
