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
  buildIncompleteMessage,
  buildInvalidMessage,
  classifyDataState,
} from "../data-classifier.ts";
import { validateExtractedFromText } from "./extracted-variables-validator.ts";
import {
  extractVariables,
  isSalaryQuery,
  mergeVariables,
} from "../variable-extractor.ts";
import type { CalculateSalaryInput } from "../types.ts";
import { defaultDeps } from "./deps.ts";
import type { CalculateSalaryDeps, CalculateSalaryResult } from "./types.ts";
import {
  buildResolvedVariables,
  variablesToRecord,
  voToExtractedVariables,
} from "./variable-adapters.ts";
import { unpackChatCommand } from "../unpack-command.ts";

const LOG_TAG = "calculate-salary";

export async function calculateSalary(
  input: CalculateSalaryInput,
  deps: CalculateSalaryDeps = defaultDeps,
): Promise<CalculateSalaryResult> {
  const startTime = Date.now();

  // Refactor 007 P2: un único punto de desempaquetado del ChatCommand.
  const { convenioId, userId, sessionId, pregunta, stream, messages } =
    unpackChatCommand(input.command);
  const variablesConocidas = voToExtractedVariables(input.command.variables);

  try {
    // 1. Cuota
    const quota = await deps.checkUserQuota(userId);
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
    const expandedQuery = expandQuery(pregunta);
    const cacheKeyText = buildCacheKeyText(expandedQuery, variablesConocidas);
    const embedding = await deps.embedQuestion(cacheKeyText);

    // 3. Cache
    const cacheHit = await deps.searchSemanticCache(
      embedding,
      convenioId,
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
    const convenio = await deps.getConvenioById(convenioId);
    if (!convenio) {
      return {
        type: "not_found",
        message: `Convenio con ID ${convenioId} no encontrado.`,
      };
    }

    // 5. Chunks (el perfil ya viene inyectado por el router, fase 8b etapa 2).
    const chunks = await deps.searchChunksByConvenio(
      embedding,
      convenioId,
      DEFAULT_CHUNK_LIMIT,
      DEFAULT_CHUNK_THRESHOLD,
    );
    const perfil = input.perfil;
    const perfilContexto = normalizePerfilContexto(perfil);

    // 6. Extraer variables + merge con las conocidas.
    // Usamos expandedQuery para que los sinónimos del query-expander ayuden a
    // encontrar categorías (ej: "camarera de pisos" → "auxiliar de limpieza").
    // Las `variablesConocidas` provienen ahora de los VOs de `command.variables`
    // (helper `voToExtractedVariables`), ya con claves canónicas — no requieren
    // `normalizeKnownVariables`.
    const extractedVars = extractVariables(expandedQuery, perfilContexto);

    // 6b. Red de seguridad: las variables extraídas del texto libre no han
    // pasado por VOs. Rechazarlas si están fuera de rango, con el mismo shape
    // `invalid_data` que aplica `toChatCommand` para las variables explícitas.
    const citations = buildCitations(chunks, convenio.urlPdf);
    const invalidFromText = validateExtractedFromText(extractedVars);
    if (invalidFromText.length > 0) {
      return {
        type: "invalid_data",
        message: `**Dato fuera de rango:** ${invalidFromText[0].reason}\n\n` +
          `Valor indicado: ${invalidFromText[0].value}\n\n` +
          "Por favor, verifica e indica el valor correcto.",
        invalidVariables: invalidFromText,
        citations,
      };
    }

    const allVariables = mergeVariables(variablesConocidas, extractedVars);

    // 7. Clasificar estado + cortocircuito (no llamamos al LLM si faltan datos).
    // Solo `incomplete` es alcanzable aquí: los invalid/conflicting se
    // filtraron upstream (VOs del ChatCommand + validateExtractedFromText).
    const classification = classifyDataState(allVariables, perfilContexto);
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

    // 8. Prompts de cálculo
    const promptContext = extractPromptContext(perfilContexto, convenio.nombre);
    promptContext.variablesUsuario = variablesToRecord(allVariables);
    const systemPrompt = buildSystemPrompt("calculate-salary", promptContext);
    const chunksFormatted = mapChunksToPromptFormat(chunks);
    const userMessage = buildUserMessage(
      chunksFormatted,
      perfilContexto,
      pregunta,
      promptContext.variablesUsuario,
      messages,
      classification.missingModulators,
    );

    // 9. LLM (stream o no) + persistencia
    const finalizeCtx = {
      deps,
      embedding,
      question: pregunta,
      convenioId,
      citations,
      sessionId,
      userId,
      logTag: LOG_TAG,
    };

    if (stream) {
      const streamResp = await deps.streamChatResponse({
        systemPrompt,
        userMessage,
      });
      return {
        type: "stream",
        stream: streamResp,
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
