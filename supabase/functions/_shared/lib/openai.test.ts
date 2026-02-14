/**
 * Tests para el servicio de Embeddings (OpenAI)
 *
 * @module openai.test
 */

import { assertEquals, assertRejects } from '@std/assert';
import { stub } from '@std/testing/mock';
import { embedQuestion, validateInput, EmbeddingError } from './openai.ts';

// ============================================
// Tests de validateInput
// ============================================

Deno.test('validateInput - rechaza null', () => {
  try {
    validateInput(null);
    throw new Error('Should have thrown');
  } catch (error) {
    assertEquals(error instanceof EmbeddingError, true);
    assertEquals((error as EmbeddingError).code, 'INVALID_INPUT');
    assertEquals((error as EmbeddingError).message, 'Text is required');
  }
});

Deno.test('validateInput - rechaza undefined', () => {
  try {
    validateInput(undefined);
    throw new Error('Should have thrown');
  } catch (error) {
    assertEquals(error instanceof EmbeddingError, true);
    assertEquals((error as EmbeddingError).code, 'INVALID_INPUT');
  }
});

Deno.test('validateInput - rechaza tipo incorrecto', () => {
  try {
    validateInput(123);
    throw new Error('Should have thrown');
  } catch (error) {
    assertEquals(error instanceof EmbeddingError, true);
    assertEquals((error as EmbeddingError).code, 'INVALID_INPUT');
    assertEquals((error as EmbeddingError).message, 'Text must be a string');
  }
});

Deno.test('validateInput - rechaza string vacio', () => {
  try {
    validateInput('   ');
    throw new Error('Should have thrown');
  } catch (error) {
    assertEquals(error instanceof EmbeddingError, true);
    assertEquals((error as EmbeddingError).code, 'INVALID_INPUT');
    assertEquals((error as EmbeddingError).message, 'Text cannot be empty');
  }
});

Deno.test('validateInput - acepta texto valido', () => {
  const result = validateInput('  Hola mundo  ');
  assertEquals(result, 'Hola mundo');
});

Deno.test('validateInput - preserva texto normal', () => {
  const result = validateInput('Cual es el salario de un camarero?');
  assertEquals(result, 'Cual es el salario de un camarero?');
});

Deno.test('validateInput - trunca texto muy largo', () => {
  const longText = 'a'.repeat(50000); // ~12500 tokens estimados
  const result = validateInput(longText);
  // MAX_INPUT_TOKENS = 8000, maxChars = 32000
  assertEquals(result.length <= 32000, true);
  assertEquals(result.length, 32000);
});

// ============================================
// Tests de embedQuestion (con mock)
// ============================================

Deno.test('embedQuestion - retorna 1536 dimensiones', async () => {
  // Mock de fetch
  const mockEmbedding = new Array(1536).fill(0.1);
  const mockResponse = {
    object: 'list',
    data: [
      {
        object: 'embedding',
        index: 0,
        embedding: mockEmbedding,
      },
    ],
    model: 'text-embedding-3-small',
    usage: { prompt_tokens: 10, total_tokens: 10 },
  };

  const fetchStub = stub(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify(mockResponse)))
  );

  // Mock de env
  const originalKey = Deno.env.get('OPENAI_API_KEY');
  Deno.env.set('OPENAI_API_KEY', 'test-key');

  try {
    const result = await embedQuestion('Cual es el salario?');
    assertEquals(result.length, 1536);
    assertEquals(result[0], 0.1);
  } finally {
    fetchStub.restore();
    if (originalKey) {
      Deno.env.set('OPENAI_API_KEY', originalKey);
    } else {
      Deno.env.delete('OPENAI_API_KEY');
    }
  }
});

Deno.test('embedQuestion - falla sin API key', async () => {
  // Quitar API key
  const originalKey = Deno.env.get('OPENAI_API_KEY');
  Deno.env.delete('OPENAI_API_KEY');

  try {
    await assertRejects(
      () => embedQuestion('test'),
      EmbeddingError,
      'Missing OPENAI_API_KEY'
    );
  } finally {
    if (originalKey) {
      Deno.env.set('OPENAI_API_KEY', originalKey);
    }
  }
});

Deno.test('embedQuestion - rechaza input vacio', async () => {
  // Mock de env (necesario para no fallar por API key primero)
  const originalKey = Deno.env.get('OPENAI_API_KEY');
  Deno.env.set('OPENAI_API_KEY', 'test-key');

  try {
    await assertRejects(() => embedQuestion(''), EmbeddingError, 'empty');
  } finally {
    if (originalKey) {
      Deno.env.set('OPENAI_API_KEY', originalKey);
    } else {
      Deno.env.delete('OPENAI_API_KEY');
    }
  }
});

Deno.test({
  name: 'embedQuestion - hace retry en 429',
  fn: async () => {
    let callCount = 0;
    const mockEmbedding = new Array(1536).fill(0.1);
    const mockResponse = {
      object: 'list',
      data: [{ object: 'embedding', index: 0, embedding: mockEmbedding }],
      model: 'text-embedding-3-small',
      usage: { prompt_tokens: 10, total_tokens: 10 },
    };

    const fetchStub = stub(globalThis, 'fetch', () => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve(new Response('Rate limited', { status: 429 }));
      }
      return Promise.resolve(new Response(JSON.stringify(mockResponse)));
    });

    const originalKey = Deno.env.get('OPENAI_API_KEY');
    Deno.env.set('OPENAI_API_KEY', 'test-key');

    try {
      const result = await embedQuestion('test');
      assertEquals(result.length, 1536);
      assertEquals(callCount, 3); // 2 fallos + 1 exito
    } finally {
      fetchStub.restore();
      if (originalKey) {
        Deno.env.set('OPENAI_API_KEY', originalKey);
      } else {
        Deno.env.delete('OPENAI_API_KEY');
      }
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'embedQuestion - hace retry en 500',
  fn: async () => {
    let callCount = 0;
    const mockEmbedding = new Array(1536).fill(0.2);
    const mockResponse = {
      object: 'list',
      data: [{ object: 'embedding', index: 0, embedding: mockEmbedding }],
      model: 'text-embedding-3-small',
      usage: { prompt_tokens: 5, total_tokens: 5 },
    };

    const fetchStub = stub(globalThis, 'fetch', () => {
      callCount++;
      if (callCount < 2) {
        return Promise.resolve(new Response('Server error', { status: 500 }));
      }
      return Promise.resolve(new Response(JSON.stringify(mockResponse)));
    });

    const originalKey = Deno.env.get('OPENAI_API_KEY');
    Deno.env.set('OPENAI_API_KEY', 'test-key');

    try {
      const result = await embedQuestion('test');
      assertEquals(result.length, 1536);
      assertEquals(callCount, 2); // 1 fallo + 1 exito
    } finally {
      fetchStub.restore();
      if (originalKey) {
        Deno.env.set('OPENAI_API_KEY', originalKey);
      } else {
        Deno.env.delete('OPENAI_API_KEY');
      }
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test('embedQuestion - falla en 401 sin retry', async () => {
  const fetchStub = stub(globalThis, 'fetch', () =>
    Promise.resolve(new Response('Unauthorized', { status: 401 }))
  );

  const originalKey = Deno.env.get('OPENAI_API_KEY');
  Deno.env.set('OPENAI_API_KEY', 'invalid-key');

  try {
    await assertRejects(
      () => embedQuestion('test'),
      EmbeddingError,
      'OpenAI API error: 401'
    );
  } finally {
    fetchStub.restore();
    if (originalKey) {
      Deno.env.set('OPENAI_API_KEY', originalKey);
    } else {
      Deno.env.delete('OPENAI_API_KEY');
    }
  }
});

Deno.test('embedQuestion - falla si respuesta vacia', async () => {
  const mockResponse = {
    object: 'list',
    data: [],
    model: 'text-embedding-3-small',
    usage: { prompt_tokens: 0, total_tokens: 0 },
  };

  const fetchStub = stub(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify(mockResponse)))
  );

  const originalKey = Deno.env.get('OPENAI_API_KEY');
  Deno.env.set('OPENAI_API_KEY', 'test-key');

  try {
    await assertRejects(
      () => embedQuestion('test'),
      EmbeddingError,
      'Empty response from OpenAI'
    );
  } finally {
    fetchStub.restore();
    if (originalKey) {
      Deno.env.set('OPENAI_API_KEY', originalKey);
    } else {
      Deno.env.delete('OPENAI_API_KEY');
    }
  }
});

Deno.test('embedQuestion - falla si dimensiones incorrectas', async () => {
  const mockResponse = {
    object: 'list',
    data: [
      {
        object: 'embedding',
        index: 0,
        embedding: [0.1, 0.2, 0.3], // Solo 3 dimensiones
      },
    ],
    model: 'text-embedding-3-small',
    usage: { prompt_tokens: 10, total_tokens: 10 },
  };

  const fetchStub = stub(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify(mockResponse)))
  );

  const originalKey = Deno.env.get('OPENAI_API_KEY');
  Deno.env.set('OPENAI_API_KEY', 'test-key');

  try {
    await assertRejects(
      () => embedQuestion('test'),
      EmbeddingError,
      'Invalid embedding dimensions'
    );
  } finally {
    fetchStub.restore();
    if (originalKey) {
      Deno.env.set('OPENAI_API_KEY', originalKey);
    } else {
      Deno.env.delete('OPENAI_API_KEY');
    }
  }
});

// ============================================
// Tests de EmbeddingError
// ============================================

Deno.test('EmbeddingError - tiene propiedades correctas', () => {
  const error = new EmbeddingError(
    'Test error',
    'RATE_LIMIT',
    true,
    { extra: 'data' }
  );

  assertEquals(error.name, 'EmbeddingError');
  assertEquals(error.message, 'Test error');
  assertEquals(error.code, 'RATE_LIMIT');
  assertEquals(error.retryable, true);
  assertEquals(error.details, { extra: 'data' });
});

Deno.test('EmbeddingError - es instancia de Error', () => {
  const error = new EmbeddingError('Test', 'API_ERROR', false);
  assertEquals(error instanceof Error, true);
  assertEquals(error instanceof EmbeddingError, true);
});
