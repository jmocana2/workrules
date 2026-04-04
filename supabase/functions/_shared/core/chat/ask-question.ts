/**
 * UseCase: AskQuestion
 * Orquesta el flujo RAG completo para responder preguntas sobre convenios
 *
 * @module ask-question
 */

import {
  AnthropicError,
  createChatResponse as defaultCreateChatResponse,
  streamChatResponse as defaultStreamChatResponse,
  type StreamOptions,
} from "../../lib/anthropic.ts";
import {
  EmbeddingError,
  embedQuestion as defaultEmbedQuestion,
} from "../../lib/openai.ts";
import {
  type CacheHit,
  checkUserQuota as defaultCheckUserQuota,
  type ChunkSearchResult,
  type Convenio,
  getConvenioById as defaultGetConvenioById,
  getPerfilByConvenio as defaultGetPerfilByConvenio,
  incrementQueryCount as defaultIncrementQueryCount,
  type QuotaStatus,
  RepositoryError,
  saveChatMessage as defaultSaveChatMessage,
  saveToSemanticCache as defaultSaveToSemanticCache,
  searchChunksByConvenio as defaultSearchChunksByConvenio,
  searchSemanticCache as defaultSearchSemanticCache,
} from "../../lib/supabase.ts";
import type { ChunkResult, PerfilContexto } from "./prompts.ts";
import {
  buildSystemPrompt,
  buildUserMessage,
  extractPromptContext,
} from "./prompts.ts";
import { expandQuery } from "./query-expander.ts";
import type { ChatCitation } from "./types.ts";

// ============================================
// TIPOS
// ============================================

export interface AskQuestionInput {
  /** UUID del convenio a consultar */
  convenioId: string;
  /** Pregunta del usuario */
  pregunta: string;
  /** UUID del usuario */
  userId: string;
  /** UUID de sesion de chat (opcional) */
  sessionId?: string;
  /** Variables adicionales del usuario (categoria, jornada, etc) */
  variables?: Record<string, string>;
  /** Si true, retorna streaming SSE */
  stream?: boolean;
}

export interface AskQuestionMetadata {
  cacheHit: boolean;
  chunksUsed: number;
  model: string;
  latencyMs: number;
}

/** Resultado exitoso con respuesta completa */
export interface AskQuestionSuccess {
  type: "success";
  response: string;
  metadata: AskQuestionMetadata;
  citations: ChatCitation[];
}

/** Resultado de cache hit */
export interface AskQuestionCacheHit {
  type: "cache_hit";
  response: string;
  metadata: AskQuestionMetadata;
  citations: ChatCitation[];
}

/** Usuario sin cuota */
export interface AskQuestionQuotaExceeded {
  type: "quota_exceeded";
  message: string;
}

/** Convenio no encontrado */
export interface AskQuestionNotFound {
  type: "not_found";
  message: string;
}

/** Error generico */
export interface AskQuestionError {
  type: "error";
  message: string;
  code: string;
}

/** Resultado de streaming */
export interface AskQuestionStreamResult {
  type: "stream";
  stream: ReadableStream<Uint8Array>;
  /** Funcion a llamar al finalizar el stream para guardar en cache */
  cleanup: (fullResponse: string) => Promise<void>;
}

export type AskQuestionResult =
  | AskQuestionSuccess
  | AskQuestionCacheHit
  | AskQuestionQuotaExceeded
  | AskQuestionNotFound
  | AskQuestionError
  | AskQuestionStreamResult;

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_CHUNK_LIMIT = 8;
const DEFAULT_CHUNK_THRESHOLD = 0.45;
const CACHE_THRESHOLD = 0.95;
const MODEL_NAME = "claude-sonnet-4-20250514";

// ============================================
// DEPENDENCIAS (para inyeccion en tests)
// ============================================

export interface AskQuestionDeps {
  checkUserQuota: (userId: string) => Promise<QuotaStatus>;
  embedQuestion: (text: string) => Promise<number[]>;
  searchSemanticCache: (
    embedding: number[],
    convenioId: string,
    threshold?: number,
  ) => Promise<CacheHit | null>;
  getConvenioById: (convenioId: string) => Promise<Convenio | null>;
  searchChunksByConvenio: (
    embedding: number[],
    convenioId: string,
    limit?: number,
    threshold?: number,
  ) => Promise<ChunkSearchResult[]>;
  getPerfilByConvenio: (
    convenioId: string,
  ) => Promise<Record<string, unknown> | null>;
  createChatResponse: (options: StreamOptions) => Promise<string>;
  streamChatResponse: (
    options: StreamOptions,
  ) => Promise<ReadableStream<Uint8Array>>;
  saveToSemanticCache: (
    embedding: number[],
    query: string,
    response: string,
    convenioId: string,
  ) => Promise<void>;
  saveChatMessage: (
    sessionId: string,
    role: "user" | "assistant" | "system",
    content: string,
  ) => Promise<void>;
  incrementQueryCount: (userId: string) => Promise<boolean>;
}

/** Dependencias por defecto (produccion) */
export const defaultDeps: AskQuestionDeps = {
  checkUserQuota: defaultCheckUserQuota,
  embedQuestion: defaultEmbedQuestion,
  searchSemanticCache: defaultSearchSemanticCache,
  getConvenioById: defaultGetConvenioById,
  searchChunksByConvenio: defaultSearchChunksByConvenio,
  getPerfilByConvenio: defaultGetPerfilByConvenio,
  createChatResponse: defaultCreateChatResponse,
  streamChatResponse: defaultStreamChatResponse,
  saveToSemanticCache: defaultSaveToSemanticCache,
  saveChatMessage: defaultSaveChatMessage,
  incrementQueryCount: defaultIncrementQueryCount,
};

// ============================================
// HELPERS
// ============================================

/**
 * Devuelve el artículo utilizable de un chunk.
 * Omite el artículo para:
 * - `tabla_salarial`: suele venir mal referenciado
 * - Contenido de ANEXOS: no tienen artículos numerados
 * - Secciones sin artículo real (clasificación profesional, categorías, etc.)
 */
function getChunkArticulo(
  metadata: Record<string, unknown>,
): string | undefined {
  const tipo = metadata?.tipo as string | undefined;
  const seccion = (metadata?.seccion as string | undefined)?.toLowerCase() || "";
  const articulo = metadata?.articulo as string | undefined;

  // Tipos que NO deben mostrar artículo
  if (tipo === "tabla_salarial") {
    return undefined;
  }

  // Secciones de ANEXO no tienen artículos numerados
  const esAnexo =
    seccion.includes("anexo") ||
    seccion.includes("tabla") ||
    seccion.includes("disposicion") ||
    seccion.includes("clasificación profesional") ||
    seccion.includes("clasificacion profesional") ||
    seccion.includes("categorías profesionales") ||
    seccion.includes("categorias profesionales") ||
    seccion.includes("niveles retributivos") ||
    seccion.includes("grupos profesionales");

  if (esAnexo) {
    return undefined;
  }

  return articulo;
}

/**
 * Convierte ChunkSearchResult a ChunkResult para prompts
 * Ignora el artículo para chunks de tipo "tabla_salarial" ya que suelen tener
 * artículos incorrectos (ej: "Art. 1" cuando realmente son del Anexo)
 */
function mapChunksToPromptFormat(
  chunks: ChunkSearchResult[],
): ChunkResult[] {
  return chunks.map((c) => {
    const metadata = c.metadata as Record<string, unknown>;

    return {
      content: c.contenido,
      articulo: getChunkArticulo(metadata),
      seccion: metadata?.seccion as string | undefined,
      similarity: c.similarity,
    };
  });
}

/**
 * Construye citaciones desde los chunks usados
 */
function buildCitations(
  chunks: ChunkSearchResult[],
): ChatCitation[] {
  return chunks.map((c) => {
    const metadata = c.metadata as Record<string, unknown>;

    return {
      articulo: getChunkArticulo(metadata),
      seccion: (metadata?.seccion as string) || null,
      chunk_id: c.chunk_id,
      relevance_score: c.similarity,
    };
  });
}

// ============================================
// USE CASE PRINCIPAL
// ============================================

/**
 * Ejecuta el flujo RAG completo para responder una pregunta sobre un convenio
 *
 * @param input - Datos de entrada (convenioId, pregunta, userId, etc)
 * @param deps - Dependencias inyectables (para testing)
 * @returns Resultado con respuesta, streaming, o error
 *
 * @example
 * const result = await askQuestion({
 *   convenioId: "uuid",
 *   pregunta: "Cual es el salario base de un camarero?",
 *   userId: "user-uuid",
 * });
 *
 * if (result.type === "success") {
 *   console.log(result.response);
 * }
 */
export async function askQuestion(
  input: AskQuestionInput,
  deps: AskQuestionDeps = defaultDeps,
): Promise<AskQuestionResult> {
  const startTime = Date.now();

  try {
    // ========================================
    // 1. Verificar cuota del usuario
    // ========================================
    const quota = await deps.checkUserQuota(input.userId);
    if (!quota.hasQuota) {
      return {
        type: "quota_exceeded",
        message:
          "Has alcanzado el limite de consultas de tu plan. Actualiza a Premium para consultas ilimitadas.",
      };
    }

    // ========================================
    // 2. Expandir consulta con sinónimos y generar embedding
    // ========================================
    const expandedQuery = expandQuery(input.pregunta);
    const embedding = await deps.embedQuestion(expandedQuery);

    // ========================================
    // 3. Buscar en semantic cache
    // ========================================
    const cacheHit = await deps.searchSemanticCache(
      embedding,
      input.convenioId,
      CACHE_THRESHOLD,
    );

    if (cacheHit) {
      // Cache hit - no incrementar cuota (es gratis)
      return {
        type: "cache_hit",
        response: cacheHit.response,
        metadata: {
          cacheHit: true,
          chunksUsed: 0,
          model: "cache",
          latencyMs: Date.now() - startTime,
        },
        citations: [],
      };
    }

    // ========================================
    // 4. Obtener convenio (validar que existe)
    // ========================================
    const convenio = await deps.getConvenioById(input.convenioId);
    if (!convenio) {
      return {
        type: "not_found",
        message: `Convenio con ID ${input.convenioId} no encontrado.`,
      };
    }

    // ========================================
    // 5. Buscar chunks y perfil en paralelo
    // ========================================
    const [chunks, perfil] = await Promise.all([
      deps.searchChunksByConvenio(
        embedding,
        input.convenioId,
        DEFAULT_CHUNK_LIMIT,
        DEFAULT_CHUNK_THRESHOLD,
      ),
      deps.getPerfilByConvenio(input.convenioId),
    ]);

    // ========================================
    // 6. Construir prompts
    // ========================================
    const perfilContexto = perfil as PerfilContexto | null;
    const promptContext = extractPromptContext(perfilContexto, convenio.nombre);
    const systemPrompt = buildSystemPrompt("ask-question", promptContext);

    const chunksFormatted = mapChunksToPromptFormat(chunks);
    const userMessage = buildUserMessage(
      chunksFormatted,
      perfilContexto,
      input.pregunta,
      input.variables,
    );

    // ========================================
    // 7. Llamar a Claude
    // ========================================
    if (input.stream) {
      // Modo streaming
      const stream = await deps.streamChatResponse({
        systemPrompt,
        userMessage,
      });

      // Retornar stream + cleanup function
      return {
        type: "stream",
        stream,
        cleanup: async (fullResponse: string) => {
          // Fire and forget para cache (no bloquear ni fallar por esto)
          deps.saveToSemanticCache(
            embedding,
            input.pregunta,
            fullResponse,
            input.convenioId,
          ).catch((err) => {
            console.error(
              "[ask-question] Stream cleanup - Error saving to cache:",
              err,
            );
          });

          // Guardar en historial si hay session (fire and forget)
          if (input.sessionId) {
            deps.saveChatMessage(
              input.sessionId,
              "user",
              input.pregunta,
            ).catch((err) => {
              console.error(
                "[ask-question] Stream cleanup - Error saving user message:",
                err,
              );
            });
            deps.saveChatMessage(
              input.sessionId,
              "assistant",
              fullResponse,
            ).catch((err) => {
              console.error(
                "[ask-question] Stream cleanup - Error saving assistant message:",
                err,
              );
            });
          }

          // Incrementar contador (este sí es crítico para la cuota)
          try {
            await deps.incrementQueryCount(input.userId);
          } catch (err) {
            console.error(
              "[ask-question] Stream cleanup - Error incrementing query count:",
              err,
            );
          }
        },
      };
    }

    // Modo no-streaming
    const response = await deps.createChatResponse({
      systemPrompt,
      userMessage,
    });

    // ========================================
    // 8. Guardar en cache e historial
    // ========================================
    // Fire and forget para cache (no bloquear respuesta)
    deps.saveToSemanticCache(
      embedding,
      input.pregunta,
      response,
      input.convenioId,
    ).catch((err) => {
      console.error("[ask-question] Error saving to cache:", err);
    });

    // Guardar en historial si hay session
    if (input.sessionId) {
      // Save sequentially to maintain order
      deps.saveChatMessage(input.sessionId, "user", input.pregunta)
        .then(() =>
          deps.saveChatMessage(input.sessionId!, "assistant", response)
        )
        .catch((err) => {
          console.error("[ask-question] Error saving chat messages:", err);
        });
    }
    // Incrementar contador de queries
    await deps.incrementQueryCount(input.userId);

    // ========================================
    // 9. Retornar respuesta
    // ========================================
    return {
      type: "success",
      response,
      metadata: {
        cacheHit: false,
        chunksUsed: chunks.length,
        model: MODEL_NAME,
        latencyMs: Date.now() - startTime,
      },
      citations: buildCitations(chunks),
    };
  } catch (error) {
    // ========================================
    // Manejo de errores
    // ========================================
    return handleError(error);
  }
}

/**
 * Mapea errores a resultado tipado
 */
function handleError(error: unknown): AskQuestionError {
  // Error de embedding (OpenAI)
  if (error instanceof EmbeddingError) {
    console.error("[ask-question] Embedding error:", error.message);
    return {
      type: "error",
      message: "Error al procesar la pregunta. Intenta de nuevo.",
      code: `EMBEDDING_${error.code}`,
    };
  }

  // Error de Anthropic
  if (error instanceof AnthropicError) {
    console.error("[ask-question] Anthropic error:", error.message);

    if (error.code === "RATE_LIMIT" || error.code === "OVERLOADED") {
      return {
        type: "error",
        message: "El servicio esta sobrecargado. Intenta en unos minutos.",
        code: `ANTHROPIC_${error.code}`,
      };
    }

    return {
      type: "error",
      message: "Error al generar la respuesta. Intenta de nuevo.",
      code: `ANTHROPIC_${error.code}`,
    };
  }

  // Error de repository (Supabase)
  if (error instanceof RepositoryError) {
    console.error("[ask-question] Repository error:", error.message);
    return {
      type: "error",
      message: "Error de base de datos. Intenta de nuevo.",
      code: `DB_${error.code}`,
    };
  }

  // Error desconocido
  console.error("[ask-question] Unexpected error:", error);
  return {
    type: "error",
    message: "Error interno del servidor.",
    code: "INTERNAL_ERROR",
  };
}
