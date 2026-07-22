/**
 * UseCase: CalculateSalary
 * Orquestador delgado sobre los módulos de `rag/` compartidos y sobre la lógica
 * específica de variables/clasificación de este use case.
 *
 * Flujo:
 *   1. Cuota
 *   2. Expandir consulta + embedding con variables en la clave
 *   3. Cache semántica
 *   4. Convenio
 *   5. Chunks + perfil en paralelo
 *   6. Extraer variables del mensaje + merge con las conocidas
 *   7. Clasificar estado de datos → cortocircuito si incompleto/inválido/conflicto
 *   8. Prompts de cálculo
 *   9. LLM (stream o no) + persistencia
 */

import type { ChatCitation, ExtractedVariables } from "../types.ts";
import {
  buildSystemPrompt,
  buildUserMessage,
  extractPromptContext,
  normalizePerfilContexto,
} from "../prompts.ts";
import { expandQuery } from "../query-expander.ts";
import { buildCacheKeyText } from "../rag/cache-key.ts";
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
import { handleError } from "../rag/error-mapper.ts";
import { persistResponse } from "../rag/finalize.ts";
import {
  buildConflictMessage,
  buildIncompleteMessage,
  buildInvalidMessage,
  classifyDataState,
} from "../data-classifier.ts";
import {
  extractVariables,
  isSalaryQuery,
  mergeVariables,
  normalizeKnownVariables,
} from "../variable-extractor.ts";
import type { CalculateSalaryInput } from "../types.ts";
import { defaultDeps } from "./deps.ts";
import type { CalculateSalaryDeps, CalculateSalaryResult } from "./types.ts";
import { buildResolvedVariables, variablesToRecord } from "./variable-adapters.ts";

const LOG_TAG = "calculate-salary";

export async function calculateSalary(
  input: CalculateSalaryInput,
  deps: CalculateSalaryDeps = defaultDeps,
): Promise<CalculateSalaryResult> {
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
    // Las variables (tipo establecimiento, categoría, turno, etc.) determinan
    // la respuesta: sin incluirlas en el texto embebido, dos consultas con la
    // misma redacción y variables distintas producen embeddings casi idénticos
    // y la cache (umbral 0.95) devuelve la respuesta del turno anterior.
    const expandedQuery = expandQuery(input.pregunta);
    const cacheKeyText = buildCacheKeyText(expandedQuery, input.variablesConocidas);
    const embedding = await deps.embedQuestion(cacheKeyText);

    // 3. Cache
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

    // 5. Chunks + perfil en paralelo
    // Si el router ya inyectó `input.perfil` (fase 8b etapa 2), reusar en vez
    // de refetch.
    const [chunks, perfil] = await Promise.all([
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
    const perfilContexto = normalizePerfilContexto(perfil);

    // 6. Extraer variables + merge con las conocidas.
    // Usamos expandedQuery para que los sinónimos del query-expander ayuden a
    // encontrar categorías (ej: "camarera de pisos" → "auxiliar de limpieza").
    // Las conocidas vienen del front con claves crudas del perfil (ej:
    // "categoria_profesional"); las normalizamos a claves canónicas antes del merge.
    const extractedVars = extractVariables(expandedQuery, perfilContexto);
    const allVariables = mergeVariables(
      normalizeKnownVariables(input.variablesConocidas),
      extractedVars,
    );

    // 7. Clasificar estado + cortocircuito (no llamamos al LLM si faltan datos).
    // Las citations y resolvedVariables se calculan aquí porque también van en
    // los estados no-completos (para que el front muestre Sources y pre-marque
    // los chips ya conocidos).
    const classification = classifyDataState(allVariables, perfilContexto);
    const citations = buildCitations(chunks, convenio.url_pdf ?? null);
    const resolvedVariables = buildResolvedVariables(allVariables, perfilContexto);

    if (classification.state === "incomplete") {
      return {
        type: "incomplete_data",
        message: buildIncompleteMessage(classification, convenio.nombre),
        missingVariables: classification.missingVariables,
        suggestions: classification.suggestions,
        citations,
        resolvedVariables,
      };
    }
    if (classification.state === "invalid") {
      return {
        type: "invalid_data",
        message: buildInvalidMessage(classification),
        invalidVariables: classification.invalidVariables,
        citations,
      };
    }
    if (classification.state === "conflicting") {
      return {
        type: "invalid_data",
        message: buildConflictMessage(classification),
        invalidVariables: [],
        conflictingVariables: classification.conflictingVariables,
        citations,
      };
    }

    // 8. Prompts de cálculo
    const promptContext = extractPromptContext(perfilContexto, convenio.nombre);
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

    // 9. LLM (stream o no) + persistencia
    const finalizeCtx = {
      deps,
      embedding,
      question: input.pregunta,
      convenioId: input.convenioId,
      citations,
      sessionId: input.sessionId,
      userId: input.userId,
      logTag: LOG_TAG,
    };

    if (input.stream) {
      const stream = await deps.streamChatResponse({ systemPrompt, userMessage });
      return {
        type: "stream",
        stream,
        citations,
        resolvedVariables,
        cleanup: (fullResponse: string) =>
          persistResponse({
            ...finalizeCtx,
            response: fullResponse,
            sequentialMessages: false,
          }),
      };
    }

    const response = await deps.createChatResponse({ systemPrompt, userMessage });
    await persistResponse({
      ...finalizeCtx,
      response,
      sequentialMessages: true,
    });

    return {
      type: "salary_calculated",
      response,
      metadata: {
        cacheHit: false,
        chunksUsed: chunks.length,
        model: MODEL_NAME,
        latencyMs: Date.now() - startTime,
        variablesUsadas: allVariables satisfies ExtractedVariables,
        resolvedVariables,
      },
      citations,
      desglose: {
        // El desglose real viene en el response de Claude.
        conceptos: [],
        totalBruto: 0,
      },
    };
  } catch (error) {
    return handleError(error, { logTag: LOG_TAG });
  }
}

export { isSalaryQuery };
