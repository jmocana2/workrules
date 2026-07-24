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
import type { PerfilRepository } from "../../ports/perfil-repository.ts";

type PerfilResult = Record<string, unknown> | null;

/**
 * Clasifica la consulta y ejecuta el UseCase apropiado.
 * Cascada con orden significativo: mode override → ranges → salary heurístico → general.
 *
 * `perfilRepository` se inyecta por DI para respetar la frontera
 * application/infrastructure: el router no importa adapters concretos.
 */
export async function classifyAndExecute(
  request: ChatRequest,
  userId: string,
  perfilRepository: PerfilRepository,
): Promise<ChatUseCaseResult> {
  // Refactor 007 fase 8a: validación de dominio antes de tocar cuota/cache/RAG.
  // Fase 8b etapa 3: el `ChatCommand` validado se propaga a los use cases.
  const validation = validateChatCommand(request, userId);
  if (!validation.ok) return validation.invalid;
  const command = validation.command;

  // Fase 8b etapa 2: fetch perfil aquí para inyectarlo en el use case.
  const perfilPromise: Promise<PerfilResult> = perfilRepository
    .getByConvenio(request.convenio_id);

  if (request.mode === "salary") {
    const perfil = await perfilPromise;
    return calculateSalary({ command, perfil });
  }

  if (isShowRangesRequest(request.pregunta)) {
    const transformedPregunta = transformRangesRequest(request.pregunta);
    const perfil = await perfilPromise;
    return askQuestion({
      command,
      perfil,
      preguntaOverride: transformedPregunta,
    });
  }

  if (isSalaryQuery(request.pregunta)) {
    const perfil = await perfilPromise;
    return calculateSalary({ command, perfil });
  }

  const perfil = await perfilPromise;
  return askQuestion({ command, perfil });
}
