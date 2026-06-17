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
  getChunksByGroup as defaultGetChunksByGroup,
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
import type { ChunkResult } from "./prompts.ts";
import {
  buildSystemPrompt,
  buildUserMessage,
  extractPromptContext,
  normalizePerfilContexto,
} from "./prompts.ts";
import { expandQuery } from "./query-expander.ts";
import type { ChatCitation, ChatHistoryMessage } from "./types.ts";

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
  /** Historial de mensajes anteriores para contexto multi-turno */
  messages?: ChatHistoryMessage[];
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
  citations: ChatCitation[];
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
const MODEL_NAME = "claude-sonnet-4-5";
/** Tope total tras expandir con vecinos de la misma sección/artículo */
const EXPANDED_CHUNK_CAP = 15;

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
  getChunksByGroup: (
    convenioId: string,
    key: "articulo" | "seccion",
    value: string,
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
    citations?: Record<string, unknown>[],
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
  getChunksByGroup: defaultGetChunksByGroup,
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
  const seccion = (metadata?.seccion as string | undefined)?.toLowerCase() ||
    "";
  const articulo = metadata?.articulo as string | undefined;

  // Tipos que NO deben mostrar artículo
  if (tipo === "tabla_salarial") {
    return undefined;
  }

  // Secciones de ANEXO no tienen artículos numerados
  const esAnexo = seccion.includes("anexo") ||
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
 * Expande el conjunto de chunks recuperados trayendo los vecinos del mismo
 * `articulo` o `seccion`. Sirve para que respuestas enumerables (áreas, grupos,
 * niveles, categorías) repartidas en chunks consecutivos lleguen completas al
 * LLM, aunque la búsqueda vectorial solo haya puntuado alto al primero.
 *
 * Estrategia:
 *   1. Para cada chunk recuperado, mira si tiene `articulo` o, en su defecto,
 *      `seccion` en metadata.
 *   2. Por cada grupo único (articulo o seccion), pide a la BD todos los chunks
 *      de ese grupo en este convenio (función `getChunksByGroup`).
 *   3. Fusiona los originales con los vecinos, deduplica por `chunk_id` y
 *      mantiene la `similarity` original cuando existe (los vecinos añadidos
 *      llevan similarity = 0 para que no afecten al ranking).
 *   4. Limita el total a `EXPANDED_CHUNK_CAP` para no inflar el contexto.
 *
 * Si la consulta falla para algún grupo, se ignora silenciosamente y se
 * devuelve lo que se haya podido reunir; nunca debe romper el flujo principal.
 */
type ChunkGroup = { key: "articulo" | "seccion"; value: string };

function detectChunkGroups(base: ChunkSearchResult[]): Map<string, ChunkGroup> {
  const groups = new Map<string, ChunkGroup>();
  for (const chunk of base) {
    const meta = chunk.metadata as Record<string, unknown>;
    const articulo = typeof meta?.articulo === "string"
      ? meta.articulo.trim()
      : "";
    const seccion = typeof meta?.seccion === "string"
      ? meta.seccion.trim()
      : "";

    if (articulo) {
      groups.set(`articulo:${articulo}`, { key: "articulo", value: articulo });
    } else if (seccion) {
      groups.set(`seccion:${seccion}`, { key: "seccion", value: seccion });
    }
  }
  return groups;
}

async function fetchNeighborsForGroups(
  groups: ChunkGroup[],
  convenioId: string,
  fetchGroup: AskQuestionDeps["getChunksByGroup"],
): Promise<ChunkSearchResult[][]> {
  return await Promise.all(
    groups.map((g) =>
      fetchGroup(convenioId, g.key, g.value).catch((err) => {
        console.error(
          `[ask-question] Error expanding chunks for ${g.key}=${g.value}:`,
          err,
        );
        return [] as ChunkSearchResult[];
      })
    ),
  );
}

function mergeChunks(
  base: ChunkSearchResult[],
  neighborResults: ChunkSearchResult[][],
): ChunkSearchResult[] {
  const byId = new Map<string, ChunkSearchResult>();
  for (const c of base) byId.set(c.chunk_id, c);

  for (const list of neighborResults) {
    for (const neighbor of list) {
      if (!byId.has(neighbor.chunk_id)) {
        byId.set(neighbor.chunk_id, neighbor);
      }
    }
  }

  // Ordenar: similarity desc primero, luego numero_chunk asc para los vecinos
  // (orden natural del documento).
  return Array.from(byId.values()).sort((a, b) => {
    if (a.similarity !== b.similarity) return b.similarity - a.similarity;
    const ia = (a.metadata as Record<string, unknown>)?.numero_chunk as
      | number
      | undefined;
    const ib = (b.metadata as Record<string, unknown>)?.numero_chunk as
      | number
      | undefined;
    return (ia ?? 0) - (ib ?? 0);
  });
}

async function expandChunksWithNeighbors(
  base: ChunkSearchResult[],
  convenioId: string,
  fetchGroup: AskQuestionDeps["getChunksByGroup"],
): Promise<ChunkSearchResult[]> {
  if (base.length === 0) return base;

  const groups = detectChunkGroups(base);
  if (groups.size === 0) return base;

  const neighborResults = await fetchNeighborsForGroups(
    Array.from(groups.values()),
    convenioId,
    fetchGroup,
  );

  return mergeChunks(base, neighborResults).slice(0, EXPANDED_CHUNK_CAP);
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
  convenioUrlPdf: string | null,
): ChatCitation[] {
  return chunks.map((c) => {
    const metadata = c.metadata as Record<string, unknown>;
    const pagina = typeof metadata?.pagina === "number" ? metadata.pagina : null;

    return {
      articulo: getChunkArticulo(metadata),
      seccion: (metadata?.seccion as string) || null,
      chunk_id: c.chunk_id,
      relevance_score: c.similarity,
      url_pdf: convenioUrlPdf,
      pagina,
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
        citations: (cacheHit.citations ?? []) as unknown as ChatCitation[],
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
    const [rawChunks, perfil] = await Promise.all([
      deps.searchChunksByConvenio(
        embedding,
        input.convenioId,
        DEFAULT_CHUNK_LIMIT,
        DEFAULT_CHUNK_THRESHOLD,
      ),
      deps.getPerfilByConvenio(input.convenioId),
    ]);

    // Expandir con vecinos del mismo artículo/sección para que respuestas
    // enumerables (áreas, grupos, categorías) lleguen completas al LLM.
    const chunks = await expandChunksWithNeighbors(
      rawChunks,
      input.convenioId,
      deps.getChunksByGroup,
    );

    // ========================================
    // 6. Construir prompts
    // ========================================
    const perfilContexto = normalizePerfilContexto(perfil);
    const promptContext = extractPromptContext(perfilContexto, convenio.nombre);
    const systemPrompt = buildSystemPrompt("ask-question", promptContext);

    const chunksFormatted = mapChunksToPromptFormat(chunks);
    const userMessage = buildUserMessage(
      chunksFormatted,
      perfilContexto,
      input.pregunta,
      input.variables,
      input.messages,
    );

    // ========================================
    // 7. Llamar a Claude
    // ========================================
    const citations = buildCitations(chunks, convenio.url_pdf ?? null);

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
        citations,
        cleanup: async (fullResponse: string) => {
          // Fire and forget para cache (no bloquear ni fallar por esto)
          deps.saveToSemanticCache(
            embedding,
            input.pregunta,
            fullResponse,
            input.convenioId,
            citations as unknown as Record<string, unknown>[],
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
      citations as unknown as Record<string, unknown>[],
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
      citations,
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
