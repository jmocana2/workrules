// supabase/functions/_shared/core/chat/ask-question.test.ts

import { assertEquals, assertExists } from "@std/assert";
import {
  askQuestion,
  type AskQuestionDeps,
  type AskQuestionInput,
} from "./ask-question.ts";
import type {
  CacheHit,
  ChunkSearchResult,
  Convenio,
  QuotaStatus,
} from "../../lib/supabase.ts";
import { RepositoryError } from "../../lib/supabase.ts";
import { EmbeddingError } from "../../lib/openai.ts";
import { AnthropicError } from "../../lib/anthropic.ts";

// ============================================
// TEST FIXTURES
// ============================================

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_EMBEDDING = new Array(1536).fill(0.1);

const MOCK_CONVENIO: Convenio = {
  id: VALID_UUID,
  nombre: "Hosteleria de Valencia",
  codigo_regcon: "46001234",
  ambito: "Provincial",
  fecha_vigencia: "2026-01-01",
  estado: "vigente",
};

const MOCK_CHUNKS: ChunkSearchResult[] = [
  {
    chunk_id: "chunk-1",
    convenio_id: VALID_UUID,
    contenido: "El salario base sera de 20.000 euros anuales.",
    metadata: { articulo: "Art. 24", seccion: "Retribuciones" },
    similarity: 0.92,
  },
  {
    chunk_id: "chunk-2",
    convenio_id: VALID_UUID,
    contenido: "La jornada anual sera de 1.826 horas.",
    metadata: { articulo: "Art. 15", seccion: "Jornada" },
    similarity: 0.85,
  },
];

const MOCK_PERFIL = {
  variables_criticas: ["categoria", "jornada"],
  categorias_profesionales: [
    { nombre: "Camarero", salario_base_anual: 20000 },
  ],
  jornada: { horas_anuales: 1826 },
};

const MOCK_CACHE_HIT: CacheHit = {
  cache_id: "cache-123",
  response: "Respuesta cacheada: El salario base es 20.000 euros.",
  similarity: 0.98,
  hit_count: 5,
};

const DEFAULT_INPUT: AskQuestionInput = {
  convenioId: VALID_UUID,
  pregunta: "Cual es el salario base?",
  userId: VALID_UUID,
};

// ============================================
// TEST HELPERS
// ============================================

interface MockCallTracker {
  checkUserQuota: unknown[][];
  embedQuestion: unknown[][];
  searchSemanticCache: unknown[][];
  getConvenioById: unknown[][];
  searchChunksByConvenio: unknown[][];
  getPerfilByConvenio: unknown[][];
  createChatResponse: unknown[][];
  streamChatResponse: unknown[][];
  saveToSemanticCache: unknown[][];
  saveChatMessage: unknown[][];
  incrementQueryCount: unknown[][];
}

interface MockOverrides {
  checkUserQuota?: () => Promise<QuotaStatus>;
  embedQuestion?: () => Promise<number[]>;
  searchSemanticCache?: () => Promise<CacheHit | null>;
  getConvenioById?: () => Promise<Convenio | null>;
  searchChunksByConvenio?: () => Promise<ChunkSearchResult[]>;
  getPerfilByConvenio?: () => Promise<Record<string, unknown> | null>;
  createChatResponse?: () => Promise<string>;
  streamChatResponse?: () => Promise<ReadableStream<Uint8Array>>;
  saveToSemanticCache?: () => Promise<void>;
  saveChatMessage?: () => Promise<void>;
  incrementQueryCount?: () => Promise<boolean>;
}

function createMockDeps(overrides: MockOverrides = {}): {
  deps: AskQuestionDeps;
  calls: MockCallTracker;
} {
  const calls: MockCallTracker = {
    checkUserQuota: [],
    embedQuestion: [],
    searchSemanticCache: [],
    getConvenioById: [],
    searchChunksByConvenio: [],
    getPerfilByConvenio: [],
    createChatResponse: [],
    streamChatResponse: [],
    saveToSemanticCache: [],
    saveChatMessage: [],
    incrementQueryCount: [],
  };

  const deps: AskQuestionDeps = {
    checkUserQuota: (...args) => {
      calls.checkUserQuota.push(args);
      return (
        overrides.checkUserQuota?.() ??
        Promise.resolve({ hasQuota: true, used: 1, limit: 5, tier: "free" as const })
      );
    },
    embedQuestion: (...args) => {
      calls.embedQuestion.push(args);
      return overrides.embedQuestion?.() ?? Promise.resolve(VALID_EMBEDDING);
    },
    searchSemanticCache: (...args) => {
      calls.searchSemanticCache.push(args);
      return overrides.searchSemanticCache?.() ?? Promise.resolve(null);
    },
    getConvenioById: (...args) => {
      calls.getConvenioById.push(args);
      return overrides.getConvenioById?.() ?? Promise.resolve(MOCK_CONVENIO);
    },
    searchChunksByConvenio: (...args) => {
      calls.searchChunksByConvenio.push(args);
      return overrides.searchChunksByConvenio?.() ?? Promise.resolve(MOCK_CHUNKS);
    },
    getPerfilByConvenio: (...args) => {
      calls.getPerfilByConvenio.push(args);
      return overrides.getPerfilByConvenio?.() ?? Promise.resolve(MOCK_PERFIL);
    },
    createChatResponse: (...args) => {
      calls.createChatResponse.push(args);
      return (
        overrides.createChatResponse?.() ??
        Promise.resolve("El salario base segun el Art. 24 es de 20.000 euros anuales.")
      );
    },
    streamChatResponse: (...args) => {
      calls.streamChatResponse.push(args);
      return overrides.streamChatResponse?.() ?? Promise.resolve(new ReadableStream());
    },
    saveToSemanticCache: (...args) => {
      calls.saveToSemanticCache.push(args);
      return overrides.saveToSemanticCache?.() ?? Promise.resolve();
    },
    saveChatMessage: (...args) => {
      calls.saveChatMessage.push(args);
      return overrides.saveChatMessage?.() ?? Promise.resolve();
    },
    incrementQueryCount: (...args) => {
      calls.incrementQueryCount.push(args);
      return overrides.incrementQueryCount?.() ?? Promise.resolve(true);
    },
  };

  return { deps, calls };
}

// ============================================
// QUOTA TESTS
// ============================================

Deno.test("askQuestion - retorna quota_exceeded si usuario no tiene cuota", async () => {
  const { deps, calls } = createMockDeps({
    checkUserQuota: () =>
      Promise.resolve({ hasQuota: false, used: 5, limit: 5, tier: "free" as const }),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "quota_exceeded");
  if (result.type === "quota_exceeded") {
    assertEquals(result.message.includes("limite"), true);
  }

  // No debe llamar a otras funciones
  assertEquals(calls.embedQuestion.length, 0);
  assertEquals(calls.searchSemanticCache.length, 0);
});

Deno.test("askQuestion - continua si usuario tiene cuota", async () => {
  const { deps, calls } = createMockDeps();

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "success");
  assertEquals(calls.checkUserQuota.length, 1);
  assertEquals(calls.embedQuestion.length, 1);
});

// ============================================
// CACHE TESTS
// ============================================

Deno.test("askQuestion - retorna cache_hit si encuentra respuesta en cache", async () => {
  const { deps } = createMockDeps({
    searchSemanticCache: () => Promise.resolve(MOCK_CACHE_HIT),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "cache_hit");
  if (result.type === "cache_hit") {
    assertEquals(result.response, MOCK_CACHE_HIT.response);
    assertEquals(result.metadata.cacheHit, true);
    assertEquals(result.metadata.chunksUsed, 0);
    assertEquals(result.metadata.model, "cache");
  }
});

Deno.test("askQuestion - no llama a Anthropic en cache hit", async () => {
  const { deps, calls } = createMockDeps({
    searchSemanticCache: () => Promise.resolve(MOCK_CACHE_HIT),
  });

  await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(calls.createChatResponse.length, 0);
  assertEquals(calls.getConvenioById.length, 0);
});

Deno.test("askQuestion - continua flujo si no hay cache hit", async () => {
  const { deps, calls } = createMockDeps({
    searchSemanticCache: () => Promise.resolve(null),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "success");
  assertEquals(calls.getConvenioById.length, 1);
  assertEquals(calls.searchChunksByConvenio.length, 1);
});

// ============================================
// CONVENIO NOT FOUND TESTS
// ============================================

Deno.test("askQuestion - retorna not_found si convenio no existe", async () => {
  const { deps, calls } = createMockDeps({
    getConvenioById: () => Promise.resolve(null),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "not_found");
  if (result.type === "not_found") {
    assertEquals(result.message.includes(VALID_UUID), true);
  }

  // No debe continuar con el flujo RAG
  assertEquals(calls.searchChunksByConvenio.length, 0);
});

// ============================================
// RAG FLOW TESTS
// ============================================

Deno.test("askQuestion - busca chunks y perfil en paralelo", async () => {
  const { deps, calls } = createMockDeps();

  await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(calls.searchChunksByConvenio.length, 1);
  assertEquals(calls.getPerfilByConvenio.length, 1);
});

Deno.test("askQuestion - funciona sin perfil JSON", async () => {
  const { deps, calls } = createMockDeps({
    getPerfilByConvenio: () => Promise.resolve(null),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "success");
  assertEquals(calls.createChatResponse.length, 1);
});

Deno.test("askQuestion - pasa convenioId y embedding a searchChunksByConvenio", async () => {
  const { deps, calls } = createMockDeps();

  await askQuestion(DEFAULT_INPUT, deps);

  const callArgs = calls.searchChunksByConvenio[0];
  assertEquals(callArgs[0], VALID_EMBEDDING); // embedding
  assertEquals(callArgs[1], VALID_UUID); // convenioId
  assertEquals(callArgs[2], 5); // limit
});

// ============================================
// ANTHROPIC CALL TESTS
// ============================================

Deno.test("askQuestion - llama a createChatResponse con prompts construidos", async () => {
  const { deps, calls } = createMockDeps();

  await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(calls.createChatResponse.length, 1);
  const callArgs = calls.createChatResponse[0][0] as { systemPrompt: string; userMessage: string };
  assertExists(callArgs.systemPrompt);
  assertExists(callArgs.userMessage);
  assertEquals(callArgs.systemPrompt.includes("Hosteleria de Valencia"), true);
});

Deno.test("askQuestion - incluye pregunta del usuario en userMessage", async () => {
  const { deps, calls } = createMockDeps();
  const pregunta = "Cuantos dias de vacaciones tengo?";

  await askQuestion({ ...DEFAULT_INPUT, pregunta }, deps);

  const callArgs = calls.createChatResponse[0][0] as { userMessage: string };
  assertEquals(callArgs.userMessage.includes(pregunta), true);
});

// ============================================
// SUCCESS RESPONSE TESTS
// ============================================

Deno.test("askQuestion - retorna success con respuesta completa", async () => {
  const { deps } = createMockDeps();

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "success");
  if (result.type === "success") {
    assertExists(result.response);
    assertEquals(result.metadata.cacheHit, false);
    assertEquals(result.metadata.chunksUsed, MOCK_CHUNKS.length);
    assertEquals(result.metadata.model, "claude-sonnet-4-20250514");
    assertEquals(typeof result.metadata.latencyMs, "number");
  }
});

Deno.test("askQuestion - incluye citations de los chunks usados", async () => {
  const { deps } = createMockDeps();

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "success");
  if (result.type === "success") {
    assertEquals(result.citations.length, MOCK_CHUNKS.length);
    assertEquals(result.citations[0].articulo, "Art. 24");
    assertEquals(result.citations[0].chunk_id, "chunk-1");
  }
});

// ============================================
// CACHE SAVE TESTS
// ============================================

Deno.test("askQuestion - guarda respuesta en cache tras success", async () => {
  const { deps, calls } = createMockDeps();

  await askQuestion({ ...DEFAULT_INPUT, pregunta: "Test question" }, deps);

  // Esperar a que se ejecute el fire-and-forget
  await new Promise((resolve) => setTimeout(resolve, 10));

  assertEquals(calls.saveToSemanticCache.length, 1);
  const saveCall = calls.saveToSemanticCache[0];
  assertEquals(saveCall[0], VALID_EMBEDDING); // embedding
  assertEquals(saveCall[1], "Test question"); // query
  assertEquals(saveCall[3], VALID_UUID); // convenioId
});

// ============================================
// SESSION MESSAGE TESTS
// ============================================

Deno.test("askQuestion - guarda mensajes en historial si hay sessionId", async () => {
  const { deps, calls } = createMockDeps();
  const sessionId = VALID_UUID;

  await askQuestion({ ...DEFAULT_INPUT, sessionId }, deps);

  // Esperar a que se ejecuten los fire-and-forget
  await new Promise((resolve) => setTimeout(resolve, 10));

  assertEquals(calls.saveChatMessage.length, 2);
  assertEquals(calls.saveChatMessage[0][0], sessionId);
  assertEquals(calls.saveChatMessage[0][1], "user");
  assertEquals(calls.saveChatMessage[1][1], "assistant");
});

Deno.test("askQuestion - no guarda mensajes si no hay sessionId", async () => {
  const { deps, calls } = createMockDeps();

  await askQuestion(DEFAULT_INPUT, deps);

  await new Promise((resolve) => setTimeout(resolve, 10));

  assertEquals(calls.saveChatMessage.length, 0);
});

// ============================================
// QUOTA INCREMENT TESTS
// ============================================

Deno.test("askQuestion - incrementa contador de queries tras success", async () => {
  const { deps, calls } = createMockDeps();

  await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(calls.incrementQueryCount.length, 1);
  assertEquals(calls.incrementQueryCount[0][0], VALID_UUID);
});

Deno.test("askQuestion - no incrementa contador en cache_hit", async () => {
  const { deps, calls } = createMockDeps({
    searchSemanticCache: () => Promise.resolve(MOCK_CACHE_HIT),
  });

  await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(calls.incrementQueryCount.length, 0);
});

// ============================================
// STREAMING TESTS
// ============================================

Deno.test("askQuestion - retorna stream si stream=true", async () => {
  const { deps, calls } = createMockDeps();

  const result = await askQuestion({ ...DEFAULT_INPUT, stream: true }, deps);

  assertEquals(result.type, "stream");
  if (result.type === "stream") {
    assertEquals(result.stream instanceof ReadableStream, true);
    assertEquals(typeof result.cleanup, "function");
  }

  // Debe llamar a streamChatResponse, no createChatResponse
  assertEquals(calls.streamChatResponse.length, 1);
  assertEquals(calls.createChatResponse.length, 0);
});

Deno.test("askQuestion - cleanup function guarda en cache e incrementa contador", async () => {
  const { deps, calls } = createMockDeps();

  const result = await askQuestion(
    { ...DEFAULT_INPUT, pregunta: "Test question", stream: true },
    deps,
  );

  assertEquals(result.type, "stream");
  if (result.type === "stream") {
    // Simular que el stream termino y llamar cleanup
    await result.cleanup("Respuesta completa del stream");

    assertEquals(calls.saveToSemanticCache.length, 1);
    assertEquals(calls.incrementQueryCount.length, 1);
  }
});

Deno.test("askQuestion - cleanup guarda mensajes si hay sessionId", async () => {
  const { deps, calls } = createMockDeps();
  const sessionId = VALID_UUID;

  const result = await askQuestion(
    { ...DEFAULT_INPUT, sessionId, stream: true },
    deps,
  );

  if (result.type === "stream") {
    await result.cleanup("Respuesta stream");

    assertEquals(calls.saveChatMessage.length, 2);
  }
});

// ============================================
// ERROR HANDLING TESTS
// ============================================

Deno.test("askQuestion - maneja error de embedding", async () => {
  const { deps } = createMockDeps({
    embedQuestion: () =>
      Promise.reject(new EmbeddingError("API Error", "API_ERROR", false)),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "error");
  if (result.type === "error") {
    assertEquals(result.code, "EMBEDDING_API_ERROR");
  }
});

Deno.test("askQuestion - maneja error de Anthropic rate limit", async () => {
  const { deps } = createMockDeps({
    createChatResponse: () =>
      Promise.reject(new AnthropicError("Rate limited", "RATE_LIMIT", true)),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "error");
  if (result.type === "error") {
    assertEquals(result.code, "ANTHROPIC_RATE_LIMIT");
    assertEquals(result.message.includes("sobrecargado"), true);
  }
});

Deno.test("askQuestion - maneja error de Anthropic overloaded", async () => {
  const { deps } = createMockDeps({
    createChatResponse: () =>
      Promise.reject(new AnthropicError("Overloaded", "OVERLOADED", true)),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "error");
  if (result.type === "error") {
    assertEquals(result.code, "ANTHROPIC_OVERLOADED");
  }
});

Deno.test("askQuestion - maneja error de repository", async () => {
  const { deps } = createMockDeps({
    searchChunksByConvenio: () =>
      Promise.reject(new RepositoryError("DB down", "DB_ERROR")),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "error");
  if (result.type === "error") {
    assertEquals(result.code, "DB_DB_ERROR");
  }
});

Deno.test("askQuestion - maneja error inesperado", async () => {
  const { deps } = createMockDeps({
    createChatResponse: () => Promise.reject(new Error("Unknown error")),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "error");
  if (result.type === "error") {
    assertEquals(result.code, "INTERNAL_ERROR");
  }
});

// ============================================
// VARIABLES TESTS
// ============================================

Deno.test("askQuestion - incluye variables del usuario en el mensaje", async () => {
  const { deps, calls } = createMockDeps();
  const variables = { categoria: "Camarero", jornada: "completa" };

  await askQuestion({ ...DEFAULT_INPUT, variables }, deps);

  const callArgs = calls.createChatResponse[0][0] as { userMessage: string };
  assertEquals(callArgs.userMessage.includes("Camarero"), true);
  assertEquals(callArgs.userMessage.includes("completa"), true);
});

// ============================================
// STREAMING CLEANUP ERROR HANDLING TESTS
// ============================================

Deno.test("askQuestion streaming - cleanup no falla si saveToSemanticCache falla", async () => {
  const { deps, calls } = createMockDeps({
    saveToSemanticCache: () => Promise.reject(new Error("Cache error")),
  });

  const result = await askQuestion({ ...DEFAULT_INPUT, stream: true }, deps);

  assertEquals(result.type, "stream");
  if (result.type === "stream") {
    // Cleanup should not throw even if cache save fails
    await result.cleanup("Test response");

    // incrementQueryCount should still be called
    assertEquals(calls.incrementQueryCount.length, 1);
  }
});

Deno.test("askQuestion streaming - cleanup no falla si saveChatMessage falla", async () => {
  const { deps, calls } = createMockDeps({
    saveChatMessage: () => Promise.reject(new Error("Chat message error")),
  });

  const result = await askQuestion(
    { ...DEFAULT_INPUT, stream: true, sessionId: "test-session" },
    deps,
  );

  assertEquals(result.type, "stream");
  if (result.type === "stream") {
    // Cleanup should not throw even if chat message save fails
    await result.cleanup("Test response");

    // incrementQueryCount should still be called
    assertEquals(calls.incrementQueryCount.length, 1);
  }
});

Deno.test("askQuestion streaming - cleanup no falla si incrementQueryCount falla", async () => {
  const { deps } = createMockDeps({
    incrementQueryCount: () => Promise.reject(new Error("Quota error")),
  });

  const result = await askQuestion({ ...DEFAULT_INPUT, stream: true }, deps);

  assertEquals(result.type, "stream");
  if (result.type === "stream") {
    // Cleanup should not throw even if increment fails
    await result.cleanup("Test response");
    // Test passes if no exception is thrown
  }
});
