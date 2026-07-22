// supabase/functions/_shared/core/chat/routing/use-case-router.ts

import { askQuestion } from "../ask-question/index.ts";
import {
  calculateSalary,
  isSalaryQuery,
} from "../calculate-salary/index.ts";
import type { ChatRequest } from "../types.ts";
import { isShowRangesRequest } from "../variable-extractor.ts";
import type { ChatUseCaseResult } from "../http/result-mapper.ts";
import { transformRangesRequest } from "./ranges-transformer.ts";
import { validateChatCommand } from "./command-validator.ts";

/**
 * Construye el input de `calculateSalary` desde un `ChatRequest`.
 * Aísla el cast a `Record<string, string | number | undefined>` en un único sitio.
 */
function buildSalaryInput(request: ChatRequest, userId: string) {
  return {
    convenioId: request.convenio_id,
    pregunta: request.pregunta,
    userId,
    sessionId: request.session_id,
    variablesConocidas: request.variables as Record<
      string,
      string | number | undefined
    >,
    stream: request.stream,
    messages: request.messages,
  };
}

/**
 * Construye el input de `askQuestion` desde un `ChatRequest`.
 */
function buildAskQuestionInput(
  request: ChatRequest,
  userId: string,
  preguntaOverride?: string,
) {
  return {
    convenioId: request.convenio_id,
    pregunta: preguntaOverride ?? request.pregunta,
    userId,
    sessionId: request.session_id,
    variables: request.variables,
    stream: request.stream,
    messages: request.messages,
  };
}

/**
 * Clasifica la consulta y ejecuta el UseCase apropiado.
 * Cascada con orden significativo: mode override → ranges → salary heurístico → general.
 */
export async function classifyAndExecute(
  request: ChatRequest,
  userId: string,
): Promise<ChatUseCaseResult> {
  // Refactor 007 fase 8a: validación de dominio antes de tocar cuota/cache/RAG.
  // Fase 8b etapa 1: `validateChatCommand` ya devuelve el `ChatCommand` en
  // caso de éxito; su propagación como firma de los use cases llega en las
  // siguientes etapas del refactor.
  const validation = validateChatCommand(request, userId);
  if (!validation.ok) return validation.invalid;

  if (request.mode === "salary") {
    return calculateSalary(buildSalaryInput(request, userId));
  }

  if (isShowRangesRequest(request.pregunta)) {
    const transformedPregunta = transformRangesRequest(request.pregunta);
    return askQuestion(
      buildAskQuestionInput(request, userId, transformedPregunta),
    );
  }

  if (isSalaryQuery(request.pregunta)) {
    return calculateSalary(buildSalaryInput(request, userId));
  }

  return askQuestion(buildAskQuestionInput(request, userId));
}
