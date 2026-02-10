// supabase/functions/_shared/lib/supabase.test.ts

import { assertEquals, assertThrows } from '@std/assert';
import {
  validateEmbedding,
  validateUUID,
  validateNonEmptyString,
  RepositoryError,
} from './supabase.ts';

// ============================================
// validateEmbedding
// ============================================

Deno.test('validateEmbedding - valid embedding with 1536 dimensions', () => {
  const embedding = new Array(1536).fill(0.1);
  const result = validateEmbedding(embedding);

  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test('validateEmbedding - rejects null', () => {
  const result = validateEmbedding(null);

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Embedding is required');
});

Deno.test('validateEmbedding - rejects undefined', () => {
  const result = validateEmbedding(undefined);

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Embedding is required');
});

Deno.test('validateEmbedding - rejects non-array', () => {
  const result = validateEmbedding('not an array');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Embedding must be an array');
});

Deno.test('validateEmbedding - rejects empty array', () => {
  const result = validateEmbedding([]);

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Embedding must have 1536 dimensions, got 0');
});

Deno.test('validateEmbedding - rejects wrong dimension count', () => {
  const embedding = new Array(512).fill(0.1);
  const result = validateEmbedding(embedding);

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Embedding must have 1536 dimensions, got 512');
});

Deno.test('validateEmbedding - rejects array with non-numbers', () => {
  const embedding = new Array(1536).fill('not a number');
  const result = validateEmbedding(embedding);

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Embedding must contain only numbers');
});

Deno.test('validateEmbedding - rejects array with NaN', () => {
  const embedding = new Array(1536).fill(0.1);
  embedding[0] = NaN;
  const result = validateEmbedding(embedding);

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Embedding must contain only numbers');
});

Deno.test('validateEmbedding - accepts zeros', () => {
  const embedding = new Array(1536).fill(0);
  const result = validateEmbedding(embedding);

  assertEquals(result.valid, true);
});

Deno.test('validateEmbedding - accepts negative numbers', () => {
  const embedding = new Array(1536).fill(-0.5);
  const result = validateEmbedding(embedding);

  assertEquals(result.valid, true);
});

// ============================================
// validateUUID
// ============================================

Deno.test('validateUUID - valid UUID with dashes', () => {
  const result = validateUUID(
    '550e8400-e29b-41d4-a716-446655440000',
    'testField'
  );

  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test('validateUUID - valid UUID without dashes', () => {
  const result = validateUUID(
    '550e8400e29b41d4a716446655440000',
    'testField'
  );

  assertEquals(result.valid, true);
});

Deno.test('validateUUID - rejects null', () => {
  const result = validateUUID(null, 'myField');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'myField is required');
});

Deno.test('validateUUID - rejects undefined', () => {
  const result = validateUUID(undefined, 'userId');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'userId is required');
});

Deno.test('validateUUID - rejects empty string', () => {
  const result = validateUUID('', 'convenioId');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'convenioId is required');
});

Deno.test('validateUUID - rejects non-string', () => {
  const result = validateUUID(12345, 'fieldName');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'fieldName must be a string');
});

Deno.test('validateUUID - rejects invalid format', () => {
  const result = validateUUID('not-a-valid-uuid', 'testId');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'testId must be a valid UUID');
});

Deno.test('validateUUID - rejects too short', () => {
  const result = validateUUID('550e8400-e29b-41d4', 'shortId');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'shortId must be a valid UUID');
});

Deno.test('validateUUID - accepts uppercase UUID', () => {
  const result = validateUUID(
    '550E8400-E29B-41D4-A716-446655440000',
    'upperId'
  );

  assertEquals(result.valid, true);
});

// ============================================
// validateNonEmptyString
// ============================================

Deno.test('validateNonEmptyString - valid non-empty string', () => {
  const result = validateNonEmptyString('hello world', 'message');

  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test('validateNonEmptyString - rejects null', () => {
  const result = validateNonEmptyString(null, 'content');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'content is required');
});

Deno.test('validateNonEmptyString - rejects undefined', () => {
  const result = validateNonEmptyString(undefined, 'query');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'query is required');
});

Deno.test('validateNonEmptyString - rejects empty string', () => {
  const result = validateNonEmptyString('', 'response');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'response is required');
});

Deno.test('validateNonEmptyString - rejects whitespace only', () => {
  const result = validateNonEmptyString('   ', 'text');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'text cannot be empty');
});

Deno.test('validateNonEmptyString - rejects tabs and newlines only', () => {
  const result = validateNonEmptyString('\t\n  \r', 'input');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'input cannot be empty');
});

Deno.test('validateNonEmptyString - rejects non-string', () => {
  const result = validateNonEmptyString(123, 'value');

  assertEquals(result.valid, false);
  assertEquals(result.error, 'value must be a string');
});

Deno.test('validateNonEmptyString - accepts string with leading/trailing spaces', () => {
  const result = validateNonEmptyString('  hello  ', 'trimmed');

  assertEquals(result.valid, true);
});

Deno.test('validateNonEmptyString - accepts single character', () => {
  const result = validateNonEmptyString('a', 'char');

  assertEquals(result.valid, true);
});

// ============================================
// RepositoryError
// ============================================

Deno.test('RepositoryError - creates error with correct properties', () => {
  const error = new RepositoryError('Test error', 'DB_ERROR', {
    detail: 'test',
  });

  assertEquals(error.message, 'Test error');
  assertEquals(error.code, 'DB_ERROR');
  assertEquals(error.details, { detail: 'test' });
  assertEquals(error.name, 'RepositoryError');
});

Deno.test('RepositoryError - is instance of Error', () => {
  const error = new RepositoryError('Test', 'INVALID_INPUT');

  assertEquals(error instanceof Error, true);
  assertEquals(error instanceof RepositoryError, true);
});

Deno.test('RepositoryError - works with all error codes', () => {
  const codes = [
    'NOT_FOUND',
    'DB_ERROR',
    'QUOTA_EXCEEDED',
    'INVALID_INPUT',
    'CONFIG_ERROR',
  ] as const;

  for (const code of codes) {
    const error = new RepositoryError(`Error ${code}`, code);
    assertEquals(error.code, code);
  }
});

Deno.test('RepositoryError - details is optional', () => {
  const error = new RepositoryError('No details', 'NOT_FOUND');

  assertEquals(error.details, undefined);
});

Deno.test('RepositoryError - can be thrown and caught', () => {
  assertThrows(
    () => {
      throw new RepositoryError('Test throw', 'INVALID_INPUT');
    },
    RepositoryError,
    'Test throw'
  );
});
