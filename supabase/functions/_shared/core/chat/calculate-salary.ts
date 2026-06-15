/**
 * UseCase: CalculateSalary
 * Caso de uso especializado en calculos economicos
 *
 * Extiende AskQuestion con:
 * - Extraccion de variables del mensaje
 * - Clasificacion de estado de datos
 * - Prompt especializado con Chain of Thought
 *
 * @module calculate-salary
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
import type {
  AskQuestionCacheHit,
  AskQuestionError,
  AskQuestionNotFound,
  AskQuestionQuotaExceeded,
  AskQuestionStreamResult,
} from "./ask-question.ts";
import {
  buildConflictMessage,
  buildIncompleteMessage,
  buildInvalidMessage,
  classifyDataState,
} from "./data-classifier.ts";
import type { ChunkResult } from "./prompts.ts";
import {
  buildSystemPrompt,
  buildUserMessage,
  extractPromptContext,
  normalizePerfilContexto,
} from "./prompts.ts";
import { expandQuery } from "./query-expander.ts";
import type {
  CalculateSalaryIncomplete,
  CalculateSalaryInput,
  CalculateSalaryInvalid,
  CalculateSalarySuccess,
  ChatCitation,
  ExtractedVariables,
} from "./types.ts";
import {
  extractVariables,
  mergeVariables,
  normalizeKnownVariables,
} from "./variable-extractor.ts";

// ============================================
// TIPOS
// ============================================

export type CalculateSalaryResult =
  | CalculateSalarySuccess
  | CalculateSalaryIncomplete
  | CalculateSalaryInvalid
  | AskQuestionCacheHit
  | AskQuestionQuotaExceeded
  | AskQuestionNotFound
  | AskQuestionError
  | AskQuestionStreamResult;

// ============================================
// DEPENDENCIAS (para inyeccion en tests)
// ============================================

export interface CalculateSalaryDeps {
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
export const defaultDeps: CalculateSalaryDeps = {
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
// CONSTANTES
// ============================================

const DEFAULT_CHUNK_LIMIT = 8;
const DEFAULT_CHUNK_THRESHOLD = 0.45;
const CACHE_THRESHOLD = 0.95;
const MODEL_NAME = "claude-sonnet-4-5";

// ============================================
// USE CASE PRINCIPAL
// ============================================

/**
 * Ejecuta el caso de uso de calculo salarial
 *
 * Flujo:
 * 1. Verificar cuota del usuario
 * 2. Generar embedding + buscar cache
 * 3. Obtener convenio
 * 4. Buscar chunks y perfil
 * 5. Extraer variables del mensaje
 * 6. Clasificar estado de datos
 * 7. Si incompleto/invalido/conflicto -> retornar mensaje
 * 8. Si completo -> construir prompt y llamar a Claude
 * 9. Guardar cache e historial
 *
 * @param input - Datos de entrada
 * @param deps - Dependencias inyectables
 * @returns Resultado del calculo o solicitud de datos
 *
 * @example
 * const result = await calculateSalary({
 *   convenioId: "uuid",
 *   pregunta: "Calcula salario de gobernanta en hotel 4 estrellas",
 *   userId: "user-uuid",
 * });
 *
 * if (result.type === "salary_calculated") {
 *   console.log(result.response);
 * } else if (result.type === "incomplete_data") {
 *   console.log("Falta:", result.missingVariables);
 * }
 */
export async function calculateSalary(
  input: CalculateSalaryInput,
  deps: CalculateSalaryDeps = defaultDeps,
): Promise<CalculateSalaryResult> {
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

    const cacheHit = await deps.searchSemanticCache(
      embedding,
      input.convenioId,
      CACHE_THRESHOLD,
    );

    if (cacheHit) {
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
    // 3. Obtener convenio
    // ========================================
    const convenio = await deps.getConvenioById(input.convenioId);
    if (!convenio) {
      return {
        type: "not_found",
        message: `Convenio con ID ${input.convenioId} no encontrado.`,
      };
    }

    // ========================================
    // 4. Buscar chunks y perfil en paralelo
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

    const perfilContexto = normalizePerfilContexto(perfil);

    // ========================================
    // 5. Extraer variables del mensaje
    // ========================================
    // IMPORTANTE: Usar expandedQuery para que los sinónimos del query-expander
    // ayuden a encontrar categorías (ej: "camarera de pisos" → "auxiliar de limpieza")
    const extractedVars = extractVariables(expandedQuery, perfilContexto);

    // Merge con variables conocidas de turnos anteriores.
    // Las conocidas vienen del front con claves crudas del perfil
    // (ej: "categoria_profesional"); las normalizamos a claves canonicas.
    const allVariables = mergeVariables(
      normalizeKnownVariables(input.variablesConocidas),
      extractedVars,
    );

    // ========================================
    // 6. Clasificar estado de datos
    // ========================================
    const classification = classifyDataState(allVariables, perfilContexto);

    // Manejar estados no completos
    if (classification.state === "incomplete") {
      return {
        type: "incomplete_data",
        message: buildIncompleteMessage(classification, convenio.nombre),
        missingVariables: classification.missingVariables,
        suggestions: classification.suggestions,
      };
    }

    if (classification.state === "invalid") {
      return {
        type: "invalid_data",
        message: buildInvalidMessage(classification),
        invalidVariables: classification.invalidVariables,
      };
    }

    if (classification.state === "conflicting") {
      return {
        type: "invalid_data",
        message: buildConflictMessage(classification),
        invalidVariables: [],
        conflictingVariables: classification.conflictingVariables,
      };
    }

    // ========================================
    // 7. Construir prompts para calculo
    // ========================================
    const promptContext = extractPromptContext(perfilContexto, convenio.nombre);

    // Anadir variables del usuario al contexto
    promptContext.variablesUsuario = variablesToRecord(allVariables);

    const systemPrompt = buildSystemPrompt("calculate-salary", promptContext);

    const chunksFormatted = mapChunksToPromptFormat(chunks);
    const userMessage = buildUserMessage(
      chunksFormatted,
      perfilContexto,
      input.pregunta,
      promptContext.variablesUsuario,
      input.messages,
      classification.missingModulators,
    );

    // ========================================
    // 8. Llamar a Claude
    // ========================================
    if (input.stream) {
      const stream = await deps.streamChatResponse({
        systemPrompt,
        userMessage,
      });

      return {
        type: "stream",
        stream,
        citations: buildCitations(chunks, convenio.url_pdf ?? null),
        cleanup: async (fullResponse: string) => {
          // Fire and forget para cache
          deps
            .saveToSemanticCache(
              embedding,
              input.pregunta,
              fullResponse,
              input.convenioId,
            )
            .catch((err) => {
              console.error(
                "[calculate-salary] Error saving to cache:",
                err,
              );
            });

          // Guardar en historial si hay session
          if (input.sessionId) {
            deps
              .saveChatMessage(input.sessionId, "user", input.pregunta)
              .then(() =>
                deps.saveChatMessage(
                  input.sessionId!,
                  "assistant",
                  fullResponse,
                )
              )
              .catch((err) => {
                console.error(
                  "[calculate-salary] Error saving chat messages:",
                  err,
                );
              });
          }
          // Incrementar contador
          try {
            await deps.incrementQueryCount(input.userId);
          } catch (err) {
            console.error(
              "[calculate-salary] Error incrementing query count:",
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
    // 9. Guardar en cache e historial
    // ========================================
    deps
      .saveToSemanticCache(
        embedding,
        input.pregunta,
        response,
        input.convenioId,
      )
      .catch((err) => {
        console.error("[calculate-salary] Error saving to cache:", err);
      });

    // Guardar en historial si hay session
    if (input.sessionId) {
      deps
        .saveChatMessage(input.sessionId, "user", input.pregunta)
        .then(() =>
          deps.saveChatMessage(input.sessionId!, "assistant", response)
        )
        .catch((err) => {
          console.error("[calculate-salary] Error saving chat messages:", err);
        });
    }

    // Incrementar contador
    await deps.incrementQueryCount(input.userId);

    // ========================================
    // 10. Retornar resultado
    // ========================================
    return {
      type: "salary_calculated",
      response,
      metadata: {
        cacheHit: false,
        chunksUsed: chunks.length,
        model: MODEL_NAME,
        latencyMs: Date.now() - startTime,
        variablesUsadas: allVariables,
      },
      citations: buildCitations(chunks, convenio.url_pdf ?? null),
      desglose: {
        // El desglose real viene en el response de Claude
        conceptos: [],
        totalBruto: 0,
      },
    };
  } catch (error) {
    return handleError(error);
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Devuelve el artículo utilizable de un chunk.
 * Para `tabla_salarial` se omite porque suele venir mal referenciado.
 */
function getChunkArticulo(
  metadata: Record<string, unknown>,
): string | undefined {
  const tipo = metadata?.tipo as string | undefined;

  return tipo === "tabla_salarial"
    ? undefined
    : (metadata?.articulo as string | undefined);
}

/**
 * Convierte ChunkSearchResult a ChunkResult para prompts
 * Ignora el artículo para chunks de tipo "tabla_salarial" ya que suelen tener
 * artículos incorrectos (ej: "Art. 1" cuando realmente son del Anexo)
 */
function mapChunksToPromptFormat(chunks: ChunkSearchResult[]): ChunkResult[] {
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

/**
 * Convierte ExtractedVariables a Record<string, string> para prompts
 */
function variablesToRecord(
  variables: ExtractedVariables,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      result[key] = String(value);
    }
  }

  return result;
}

/**
 * Mapea errores a resultado tipado
 */
function handleError(error: unknown): AskQuestionError {
  // Error de embedding (OpenAI)
  if (error instanceof EmbeddingError) {
    console.error("[calculate-salary] Embedding error:", error.message);
    return {
      type: "error",
      message: "Error al procesar la pregunta. Intenta de nuevo.",
      code: `EMBEDDING_${error.code}`,
    };
  }

  // Error de Anthropic
  if (error instanceof AnthropicError) {
    console.error("[calculate-salary] Anthropic error:", error.message);

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
    console.error("[calculate-salary] Repository error:", error.message);
    return {
      type: "error",
      message: "Error de base de datos. Intenta de nuevo.",
      code: `DB_${error.code}`,
    };
  }

  // Error desconocido
  console.error("[calculate-salary] Unexpected error:", error);
  return {
    type: "error",
    message: "Error interno del servidor.",
    code: "INTERNAL_ERROR",
  };
}

// Re-exportar helpers utiles
export { isSalaryQuery } from "./variable-extractor.ts";
