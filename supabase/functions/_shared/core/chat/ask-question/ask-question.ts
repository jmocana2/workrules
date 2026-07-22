/**
 * Orquestador del flujo RAG: cuota → cache → convenio → chunks → expansión →
 * prompts → LLM (stream o no) → persistencia. Composición delgada sobre los
 * módulos hermanos; toda la lógica pura y las reglas de dominio viven fuera.
 */

import {
  buildSystemPrompt,
  buildUserMessage,
  extractPromptContext,
  normalizePerfilContexto,
} from "../prompts.ts";
import { expandQuery } from "../query-expander.ts";
import type { ChatCitation } from "../types.ts";
import { buildCacheKeyText } from "../rag/cache-key.ts";
import { expandChunksWithNeighbors } from "./chunk-expansion.ts";
import {
  buildCitations,
  mapChunksToPromptFormat,
} from "../rag/chunk-rules.ts";
import {
  CACHE_THRESHOLD,
  DEFAULT_CHUNK_LIMIT,
  DEFAULT_CHUNK_THRESHOLD,
  MODEL_NAME,
} from "../rag/config.ts";
import { defaultDeps } from "./deps.ts";
import { handleError } from "../rag/error-mapper.ts";
import { persistResponse } from "../rag/finalize.ts";
import type {
  AskQuestionDeps,
  AskQuestionInput,
  AskQuestionResult,
} from "./types.ts";

/**
 * Ejecuta el flujo RAG completo para responder una pregunta sobre un convenio.
 *
 * @param input - Datos de entrada (convenioId, pregunta, userId, etc)
 * @param deps  - Dependencias inyectables (para testing)
 */
export async function askQuestion(
  input: AskQuestionInput,
  deps: AskQuestionDeps = defaultDeps,
): Promise<AskQuestionResult> {
  const startTime = Date.now();

  try {
    // 1. Cuota
    const quota = await deps.checkUserQuota(input.userId);
    if (!quota.hasQuota) {
      return {
        type: "quota_exceeded",
        message:
          "Has alcanzado el limite de consultas de tu plan. Actualiza a Premium para consultas ilimitadas.",
      };
    }

    // 2. Expandir consulta + embedding.
    // Las variables (turno, jornada, categoría, etc.) forman parte de la clave
    // de cache: dos preguntas con la misma redacción pero variables distintas
    // producen embeddings casi idénticos y, con umbral 0.95, la cache
    // devolvería la respuesta anterior.
    const expandedQuery = expandQuery(input.pregunta);
    const cacheKeyText = buildCacheKeyText(expandedQuery, input.variables);
    const embedding = await deps.embedQuestion(cacheKeyText);

    // 3. Cache semántica
    const cacheHit = await deps.searchSemanticCache(
      embedding,
      input.convenioId,
      CACHE_THRESHOLD,
    );
    if (cacheHit) {
      // Cache hit no consume cuota.
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

    // 4. Convenio
    const convenio = await deps.getConvenioById(input.convenioId);
    if (!convenio) {
      return {
        type: "not_found",
        message: `Convenio con ID ${input.convenioId} no encontrado.`,
      };
    }

    // 5. Chunks + perfil en paralelo, y expansión con vecinos.
    // Si el router ya inyectó `input.perfil` (fase 8b etapa 2), reusar en vez
    // de refetch.
    const [rawChunks, perfil] = await Promise.all([
      deps.searchChunksByConvenio(
        embedding,
        input.convenioId,
        DEFAULT_CHUNK_LIMIT,
        DEFAULT_CHUNK_THRESHOLD,
      ),
      input.perfil !== undefined
        ? Promise.resolve(input.perfil)
        : deps.getPerfilByConvenio(input.convenioId),
    ]);
    const chunks = await expandChunksWithNeighbors(
      rawChunks,
      input.convenioId,
      deps.getChunksByGroup,
    );

    // 6. Prompts
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

    // 7. Claude
    const citations = buildCitations(chunks, convenio.url_pdf ?? null);

    if (input.stream) {
      const stream = await deps.streamChatResponse({ systemPrompt, userMessage });
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

    const response = await deps.createChatResponse({ systemPrompt, userMessage });

    // 8. Persistencia (cache + historial + cuota)
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

    // 9. Respuesta
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
    return handleError(error);
  }
}
