/**
 * UseCase: AskQuestion
 * Orquesta el flujo RAG completo para responder preguntas sobre convenios
 *
 * @module ask-question
 */

import {
  createChatResponse as defaultCreateChatResponse,
  streamChatResponse as defaultStreamChatResponse,
} from "../../lib/anthropic.ts";
import { embedQuestion as defaultEmbedQuestion } from "../../lib/openai.ts";
import {
  checkUserQuota as defaultCheckUserQuota,
  getChunksByGroup as defaultGetChunksByGroup,
  getConvenioById as defaultGetConvenioById,
  getPerfilByConvenio as defaultGetPerfilByConvenio,
  incrementQueryCount as defaultIncrementQueryCount,
  saveChatMessage as defaultSaveChatMessage,
  saveToSemanticCache as defaultSaveToSemanticCache,
  searchChunksByConvenio as defaultSearchChunksByConvenio,
  searchSemanticCache as defaultSearchSemanticCache,
} from "../../lib/supabase.ts";
import {
  buildSystemPrompt,
  buildUserMessage,
  extractPromptContext,
  normalizePerfilContexto,
} from "./prompts.ts";
import { expandQuery } from "./query-expander.ts";
import type { ChatCitation } from "./types.ts";
import {
  CACHE_THRESHOLD,
  DEFAULT_CHUNK_LIMIT,
  DEFAULT_CHUNK_THRESHOLD,
  MODEL_NAME,
} from "./ask-question/config.ts";
import type {
  AskQuestionDeps,
  AskQuestionInput,
  AskQuestionResult,
} from "./ask-question/types.ts";
import { buildCacheKeyText } from "./ask-question/cache-key.ts";
import { handleError } from "./ask-question/error-mapper.ts";
import {
  buildCitations,
  mapChunksToPromptFormat,
} from "./ask-question/chunk-rules.ts";
import { expandChunksWithNeighbors } from "./ask-question/chunk-expansion.ts";
import { persistResponse } from "./ask-question/finalize.ts";

export type {
  AskQuestionCacheHit,
  AskQuestionDeps,
  AskQuestionError,
  AskQuestionInput,
  AskQuestionMetadata,
  AskQuestionNotFound,
  AskQuestionQuotaExceeded,
  AskQuestionResult,
  AskQuestionStreamResult,
  AskQuestionSuccess,
} from "./ask-question/types.ts";

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
    // Las variables (turno, jornada, categoría, etc.) deben formar parte de la
    // clave de cache: dos preguntas con la misma redacción pero variables
    // distintas (p. ej. turno mañana vs. tarde) producen embeddings casi
    // idénticos y, con umbral 0.95, la cache devolvería la respuesta anterior.
    const expandedQuery = expandQuery(input.pregunta);
    const cacheKeyText = buildCacheKeyText(expandedQuery, input.variables);
    const embedding = await deps.embedQuestion(cacheKeyText);

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
        cleanup: (fullResponse: string) =>
          persistResponse({
            deps,
            embedding,
            question: input.pregunta,
            response: fullResponse,
            convenioId: input.convenioId,
            citations,
            sessionId: input.sessionId,
            userId: input.userId,
            logTag: "Stream cleanup",
            sequentialMessages: false,
          }),
      };
    }

    // Modo no-streaming
    const response = await deps.createChatResponse({
      systemPrompt,
      userMessage,
    });

    // ========================================
    // 8. Guardar en cache e historial + incrementar cuota
    // ========================================
    await persistResponse({
      deps,
      embedding,
      question: input.pregunta,
      response,
      convenioId: input.convenioId,
      citations,
      sessionId: input.sessionId,
      userId: input.userId,
      logTag: "non-stream",
      sequentialMessages: true,
    });

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

