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
import { getPerfilByConvenio } from "../../../lib/supabase.ts";

type PerfilResult = Record<string, unknown> | null;

/**
 * Construye el input de `calculateSalary` desde un `ChatRequest`.
 * Aísla el cast a `Record<string, string | number | undefined>` en un único sitio.
 */
function buildSalaryInput(
  request: ChatRequest,
  userId: string,
  perfil: PerfilResult,
) {
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
    perfil,
  };
}

/**
 * Construye el input de `askQuestion` desde un `ChatRequest`.
 */
function buildAskQuestionInput(
  request: ChatRequest,
  userId: string,
  perfil: PerfilResult,
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
    perfil,
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

  // Fase 8b etapa 2: fetch perfil aquí para inyectarlo en el use case.
  // Se lanza en paralelo con la clasificación por regex (barato) para no
  // serializar innecesariamente respecto al pipeline downstream.
  const perfilPromise: Promise<PerfilResult> = getPerfilByConvenio(
    request.convenio_id,
  );

  if (request.mode === "salary") {
    const perfil = await perfilPromise;
    return calculateSalary(buildSalaryInput(request, userId, perfil));
  }

  if (isShowRangesRequest(request.pregunta)) {
    const transformedPregunta = transformRangesRequest(request.pregunta);
    const perfil = await perfilPromise;
    return askQuestion(
      buildAskQuestionInput(request, userId, perfil, transformedPregunta),
    );
  }

  if (isSalaryQuery(request.pregunta)) {
    const perfil = await perfilPromise;
    return calculateSalary(buildSalaryInput(request, userId, perfil));
  }

  const perfil = await perfilPromise;
  return askQuestion(buildAskQuestionInput(request, userId, perfil));
}
