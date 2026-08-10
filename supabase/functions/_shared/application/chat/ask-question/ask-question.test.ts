// supabase/functions/_shared/application/chat/ask-question/ask-question.test.ts

import { assertEquals, assertExists } from "@std/assert";
import { AnthropicError } from "../../../lib/anthropic.ts";
import { EmbeddingError } from "../../../lib/openai.ts";
import { RepositoryError } from "../../../lib/supabase.ts";
import type {
  CacheHit,
  ConvenioSummary,
  QuotaStatus,
  RetrievedChunk,
} from "../../ports/dtos.ts";
import { askQuestion } from "./ask-question.ts";
import type { AskQuestionDeps, AskQuestionInput } from "./types.ts";
import { toChatCommand } from "../../../domain/chat-command/input-mapper.ts";
import type { ChatCommand } from "../../../domain/chat-command/chat-command.ts";

// ============================================
// TEST FIXTURES
// ============================================

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_EMBEDDING = new Array(1536).fill(0.1);

const MOCK_CONVENIO: ConvenioSummary = {
  id: VALID_UUID,
  nombre: "Hosteleria de Valencia",
  nombreOficial: null,
  nombreCorto: null,
  codigoRegcon: "46001234",
  ambito: "Provincial",
  ambitoTerritorial: null,
  fechaVigencia: "2026-01-01",
  estado: "vigente",
  urlPdf: null,
};

const MOCK_CHUNKS: RetrievedChunk[] = [
  {
    chunkId: "chunk-1",
    convenioId: VALID_UUID,
    content: "El salario base sera de 20.000 euros anuales.",
    metadata: { articulo: "Art. 24", seccion: "Retribuciones" },
    similarity: 0.92,
  },
  {
    chunkId: "chunk-2",
    convenioId: VALID_UUID,
    content: "La jornada anual sera de 1.826 horas.",
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
  cacheId: "cache-123",
  response: "Respuesta cacheada: El salario base es 20.000 euros.",
  similarity: 0.98,
  hitCount: 5,
  citations: [],
};

/**
 * Overrides ergonómicos para construir un `AskQuestionInput` desde campos
 * crudos (como los usaba el input pre-refactor 007 fase 8b). Todo pasa por
 * `toChatCommand` para producir el `ChatCommand` que espera el use case.
 */
interface RawInputOverrides {
  convenioId?: string;
  userId?: string;
  sessionId?: string;
  pregunta?: string;
  stream?: boolean;
  variables?: Record<string, string>;
  messages?: { role: "user" | "assistant"; content: string }[];
  perfil?: Record<string, unknown> | null;
}

function buildCommand(overrides: RawInputOverrides = {}): ChatCommand {
  const result = toChatCommand({
    convenio_id: overrides.convenioId ?? VALID_UUID,
    user_id: overrides.userId ?? VALID_UUID,
    pregunta: overrides.pregunta ?? "Cual es el salario base?",
    session_id: overrides.sessionId,
    variables: overrides.variables,
    messages: overrides.messages,
    stream: overrides.stream,
  });
  if (!result.ok) {
    throw new Error(
      `Test fixture invalid: ${JSON.stringify(result.error)}`,
    );
  }
  return result.value;
}

function makeInput(overrides: RawInputOverrides = {}): AskQuestionInput {
  return {
    command: buildCommand(overrides),
    perfil: overrides.perfil !== undefined ? overrides.perfil : MOCK_PERFIL,
  };
}

const DEFAULT_INPUT: AskQuestionInput = makeInput();

// ============================================
// TEST HELPERS
// ============================================

interface MockCallTracker {
  checkUserQuota: unknown[][];
  embedQuestion: unknown[][];
  searchSemanticCache: unknown[][];
  getConvenioById: unknown[][];
  searchChunksByConvenio: unknown[][];
  getChunksByGroup: unknown[][];
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
  getConvenioById?: () => Promise<ConvenioSummary | null>;
  searchChunksByConvenio?: () => Promise<RetrievedChunk[]>;
  getChunksByGroup?: () => Promise<RetrievedChunk[]>;
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
    getChunksByGroup: [],
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
          Promise.resolve({
            hasQuota: true,
            used: 1,
            limit: 5,
            tier: "free" as const,
          })
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
      return overrides.searchChunksByConvenio?.() ??
        Promise.resolve(MOCK_CHUNKS);
    },
    getChunksByGroup: (...args) => {
      calls.getChunksByGroup.push(args);
      // Por defecto, no añadir vecinos (devolver lista vacía)
      return overrides.getChunksByGroup?.() ?? Promise.resolve([]);
    },
    getPerfilByConvenio: (...args) => {
      calls.getPerfilByConvenio.push(args);
      return overrides.getPerfilByConvenio?.() ?? Promise.resolve(MOCK_PERFIL);
    },
    createChatResponse: (...args) => {
      calls.createChatResponse.push(args);
      return (
        overrides.createChatResponse?.() ??
          Promise.resolve(
            "El salario base segun el Art. 24 es de 20.000 euros anuales.",
          )
      );
    },
    streamChatResponse: (...args) => {
      calls.streamChatResponse.push(args);
      return overrides.streamChatResponse?.() ??
        Promise.resolve(new ReadableStream());
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
      Promise.resolve({
        hasQuota: false,
        used: 5,
        limit: 5,
        tier: "free" as const,
      }),
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

Deno.test("askQuestion - busca chunks (perfil ya inyectado por el router)", async () => {
  // Refactor 007 fase 8b etapa 2: el router pre-fetchea el perfil y lo pasa
  // en el input. El use case no vuelve a llamar a `getPerfilByConvenio`.
  const { deps, calls } = createMockDeps();

  await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(calls.searchChunksByConvenio.length, 1);
  assertEquals(calls.getPerfilByConvenio.length, 0);
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
  assertEquals(callArgs[2], 8); // limit (increased for better context retrieval)
});

// ============================================
// ANTHROPIC CALL TESTS
// ============================================

Deno.test("askQuestion - llama a createChatResponse con prompts construidos", async () => {
  const { deps, calls } = createMockDeps();

  await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(calls.createChatResponse.length, 1);
  const callArgs = calls.createChatResponse[0][0] as {
    systemPrompt: string;
    userMessage: string;
  };
  assertExists(callArgs.systemPrompt);
  assertExists(callArgs.userMessage);
  assertEquals(callArgs.systemPrompt.includes("Hosteleria de Valencia"), true);
});

Deno.test("askQuestion - incluye pregunta del usuario en userMessage", async () => {
  const { deps, calls } = createMockDeps();
  const pregunta = "Cuantos dias de vacaciones tengo?";

  await askQuestion(makeInput({ pregunta }), deps);

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
    assertEquals(result.metadata.model, "claude-sonnet-4-5");
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

Deno.test("askQuestion - omite articulo en citations de tabla salarial", async () => {
  const { deps } = createMockDeps({
    searchChunksByConvenio: () =>
      Promise.resolve([
        {
          chunkId: "chunk-tabla",
          convenioId: VALID_UUID,
          content: "Tabla salarial 2026 para camarero",
          metadata: {
            articulo: "Art. 1",
            seccion: "Tablas salariales",
            tipo: "tabla_salarial",
          },
          similarity: 0.91,
        },
      ]),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "success");
  if (result.type === "success") {
    assertEquals(result.citations.length, 1);
    assertEquals(result.citations[0].articulo, undefined);
    assertEquals(result.citations[0].seccion, "Tablas salariales");
  }
});

// ============================================
// CACHE SAVE TESTS
// ============================================

Deno.test("askQuestion - guarda respuesta en cache tras success", async () => {
  const { deps, calls } = createMockDeps();

  await askQuestion(makeInput({ pregunta: "Test question" }), deps);

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

  await askQuestion(makeInput({ sessionId }), deps);

  assertEquals(calls.saveChatMessage.length, 2);
  assertEquals(calls.saveChatMessage[0][0], sessionId);
  assertEquals(calls.saveChatMessage[0][1], "user");
  assertEquals(calls.saveChatMessage[1][1], "assistant");
});

Deno.test("askQuestion - no guarda mensajes si no hay sessionId", async () => {
  const { deps, calls } = createMockDeps();

  await askQuestion(DEFAULT_INPUT, deps);

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

  const result = await askQuestion(makeInput({ stream: true }), deps);

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
    makeInput({ pregunta: "Test question", stream: true }),
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
    makeInput({ sessionId, stream: true }),
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
  const variables = {
    categoria: "Camarero",
    jornada: "completa",
    horasSemanales: "40",
  };

  await askQuestion(makeInput({ variables }), deps);

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

  const result = await askQuestion(makeInput({ stream: true }), deps);

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
    makeInput({ stream: true, sessionId: VALID_UUID }),
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

  const result = await askQuestion(makeInput({ stream: true }), deps);

  assertEquals(result.type, "stream");
  if (result.type === "stream") {
    // Cleanup should not throw even if increment fails
    await result.cleanup("Test response");
    // Test passes if no exception is thrown
  }
});

// ============================================
// CITATIONS URL_PDF TESTS
// ============================================

Deno.test("askQuestion - citations incluyen url_pdf del convenio", async () => {
  const { deps } = createMockDeps({
    getConvenioById: () =>
      Promise.resolve({
        ...MOCK_CONVENIO,
        urlPdf: "https://bocm.es/hosteleria-2024.pdf",
      }),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "success");
  if (result.type === "success") {
    assertEquals(result.citations[0].url_pdf, "https://bocm.es/hosteleria-2024.pdf");
    assertEquals(result.citations[1].url_pdf, "https://bocm.es/hosteleria-2024.pdf");
  }
});

Deno.test("askQuestion - citations url_pdf es null si convenio no lo tiene", async () => {
  const { deps } = createMockDeps();

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "success");
  if (result.type === "success") {
    assertEquals(result.citations[0].url_pdf, null);
  }
});

Deno.test("askQuestion - citations incluyen pagina del chunk metadata", async () => {
  const { deps } = createMockDeps({
    getConvenioById: () =>
      Promise.resolve({
        ...MOCK_CONVENIO,
        urlPdf: "https://bocm.es/hosteleria-2024.pdf",
      }),
    searchChunksByConvenio: () =>
      Promise.resolve([
        {
          chunkId: "chunk-pagina",
          convenioId: VALID_UUID,
          content: "Articulo con pagina conocida",
          metadata: { articulo: "Art. 24", seccion: "Retribuciones", pagina: 42 },
          similarity: 0.9,
        },
      ]),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "success");
  if (result.type === "success") {
    assertEquals(result.citations[0].pagina, 42);
  }
});

Deno.test("askQuestion - citations pagina es null si no esta en metadata", async () => {
  const { deps } = createMockDeps();

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "success");
  if (result.type === "success") {
    assertEquals(result.citations[0].pagina, null);
  }
});

// ============================================
// CHUNK EXPANSION TESTS (Solución A: vecinos por artículo/sección)
// ============================================

Deno.test("askQuestion - llama a getChunksByGroup por cada articulo unico recuperado", async () => {
  const { deps, calls } = createMockDeps();

  await askQuestion(DEFAULT_INPUT, deps);

  // MOCK_CHUNKS tiene Art. 24 y Art. 15 → 2 grupos únicos
  assertEquals(calls.getChunksByGroup.length, 2);
  const articulosLlamados = calls.getChunksByGroup
    .map((c) => c[2] as string)
    .sort();
  assertEquals(articulosLlamados, ["Art. 15", "Art. 24"]);
});

Deno.test("askQuestion - expande con chunks vecinos del mismo articulo", async () => {
  // Simula el caso "áreas funcionales": un solo chunk recuperado pero el
  // artículo tiene 3 chunks consecutivos en la BD.
  const baseChunk: RetrievedChunk = {
    chunkId: "chunk-area-1",
    convenioId: VALID_UUID,
    content: "Area 1 y Area 2 ...",
    metadata: { articulo: "Art. 15", seccion: "Areas de actividad", numero_chunk: 10 },
    similarity: 0.88,
  };
  const neighbor2: RetrievedChunk = {
    chunkId: "chunk-area-2",
    convenioId: VALID_UUID,
    content: "Area 3 y Area 4 ...",
    metadata: { articulo: "Art. 15", seccion: "Areas de actividad", numero_chunk: 11 },
    similarity: 0,
  };
  const neighbor3: RetrievedChunk = {
    chunkId: "chunk-area-3",
    convenioId: VALID_UUID,
    content: "Area 5 y Area 6 ...",
    metadata: { articulo: "Art. 15", seccion: "Areas de actividad", numero_chunk: 12 },
    similarity: 0,
  };

  const { deps, calls } = createMockDeps({
    searchChunksByConvenio: () => Promise.resolve([baseChunk]),
    getChunksByGroup: () => Promise.resolve([baseChunk, neighbor2, neighbor3]),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "success");
  if (result.type === "success") {
    // chunksUsed refleja el conjunto expandido (1 original + 2 vecinos = 3)
    assertEquals(result.metadata.chunksUsed, 3);
    assertEquals(result.citations.length, 3);
  }

  // Verificar que se llamó a getChunksByGroup con articulo
  assertEquals(calls.getChunksByGroup.length, 1);
  assertEquals(calls.getChunksByGroup[0][1], "articulo");
  assertEquals(calls.getChunksByGroup[0][2], "Art. 15");
});

Deno.test("askQuestion - usa seccion como fallback cuando el chunk no tiene articulo", async () => {
  const sinArticulo: RetrievedChunk = {
    chunkId: "chunk-anexo",
    convenioId: VALID_UUID,
    content: "Tabla salarial ...",
    metadata: { seccion: "Anexo I - Tablas Salariales" },
    similarity: 0.8,
  };

  const { deps, calls } = createMockDeps({
    searchChunksByConvenio: () => Promise.resolve([sinArticulo]),
  });

  await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(calls.getChunksByGroup.length, 1);
  assertEquals(calls.getChunksByGroup[0][1], "seccion");
  assertEquals(calls.getChunksByGroup[0][2], "Anexo I - Tablas Salariales");
});

Deno.test("askQuestion - no rompe si getChunksByGroup falla", async () => {
  const { deps } = createMockDeps({
    getChunksByGroup: () => Promise.reject(new Error("DB down")),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  // Debe completar con éxito usando solo los chunks originales
  assertEquals(result.type, "success");
  if (result.type === "success") {
    assertEquals(result.metadata.chunksUsed, MOCK_CHUNKS.length);
  }
});

Deno.test("askQuestion - respeta tope EXPANDED_CHUNK_CAP al expandir", async () => {
  const base: RetrievedChunk = {
    chunkId: "base-1",
    convenioId: VALID_UUID,
    content: "base",
    metadata: { articulo: "Art. 99" },
    similarity: 0.9,
  };
  // Devolvemos 30 vecinos; debe truncar a EXPANDED_CHUNK_CAP (15)
  const muchosVecinos: RetrievedChunk[] = Array.from({ length: 30 }, (_, i) => ({
    chunkId: `vec-${i}`,
    convenioId: VALID_UUID,
    content: `vecino ${i}`,
    metadata: { articulo: "Art. 99", numero_chunk: i },
    similarity: 0,
  }));

  const { deps } = createMockDeps({
    searchChunksByConvenio: () => Promise.resolve([base]),
    getChunksByGroup: () => Promise.resolve(muchosVecinos),
  });

  const result = await askQuestion(DEFAULT_INPUT, deps);

  assertEquals(result.type, "success");
  if (result.type === "success") {
    assertEquals(result.metadata.chunksUsed, 15);
  }
});
