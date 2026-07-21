// supabase/functions/_shared/core/chat/routing/command-validator.ts
//
// Fase 8a del refactor 007: valida el input con `toChatCommand` como primera
// operación del router. Devuelve `invalid_data` tipado si falla, para que el
// caller responda antes de tocar cuota/cache/RAG.
//
// Fase 8b (futuro): tras esta validación, el `ChatCommand` construido se
// pasará como firma de ask-question / calculate-salary en vez de ChatRequest.

import {
  ChatRequestRaw,
  InvalidChatInput,
  toChatCommand,
} from "../../../domain/chat-command/input-mapper.ts";
import type { ChatRequest, InvalidVariable } from "../types.ts";
import type { CalculateSalaryInvalid } from "../types.ts";

/**
 * Valida el `ChatRequest` construyendo un `ChatCommand`. Solo devuelve algo
 * cuando la validación falla; en éxito devuelve `null` y el router prosigue
 * con la ruta actual.
 */
export function validateChatCommand(
  request: ChatRequest,
  userId: string,
): CalculateSalaryInvalid | null {
  const raw: ChatRequestRaw = {
    convenio_id: request.convenio_id,
    user_id: userId,
    pregunta: request.pregunta,
    session_id: request.session_id,
    variables: request.variables as Record<
      string,
      string | number | undefined
    >,
    messages: request.messages,
    stream: request.stream,
    mode: request.mode,
  };

  const result = toChatCommand(raw);
  if (result.ok) return null;

  return mapInvalidInputToResult(result.error);
}

// ============================================
// MAPEO DE ERRORES A `invalid_data`
// ============================================

function reason(kind: string): string {
  // Reason estable, tipada; el frontend puede pattern-matchearla.
  return kind;
}

function invalidVarField(
  err: InvalidChatInput,
): InvalidVariable | null {
  switch (err.kind) {
    case "horas_semanales":
    case "horas_extra_anuales":
    case "horas_nocturnas":
    case "antiguedad_anos":
      return {
        name: err.field,
        reason: `${err.field}_${err.cause.kind}`,
        value: undefined,
      };
    case "jornada_invalida": {
      const causaHoras =
        err.cause.kind === "completa_con_horas_bajas" ||
          err.cause.kind === "parcial_con_horas_completas"
          ? err.cause.horas
          : undefined;
      return { name: "jornada", reason: err.cause.kind, value: causaHoras };
    }
    case "jornada_tipo_desconocido":
      return {
        name: "jornada",
        reason: "jornada_tipo_desconocido",
        value: err.raw,
      };
    case "horas_nocturnas_exceden_base_anual":
      return {
        name: "horasNocturnas",
        reason: "horas_nocturnas_exceden_base_anual",
        value: err.horasNocturnas,
      };
    default:
      return null;
  }
}

function mapInvalidInputToResult(
  error: InvalidChatInput,
): CalculateSalaryInvalid {
  const invalidVar = invalidVarField(error);
  const message = buildMessage(error);

  return {
    type: "invalid_data",
    message,
    invalidVariables: invalidVar ? [invalidVar] : [],
  };
}

function buildMessage(error: InvalidChatInput): string {
  switch (error.kind) {
    case "pregunta_empty":
      return "La pregunta no puede estar vacia";
    case "convenio_id":
      return `convenio_id invalido: ${reason(error.cause.kind)}`;
    case "user_id":
      return `user_id invalido: ${reason(error.cause.kind)}`;
    case "session_id":
      return `session_id invalido: ${reason(error.cause.kind)}`;
    case "horas_semanales":
      return `horasSemanales invalidas: ${reason(error.cause.kind)}`;
    case "horas_extra_anuales":
      return `horasExtra invalidas: ${reason(error.cause.kind)}`;
    case "horas_nocturnas":
      return `horasNocturnas invalidas: ${reason(error.cause.kind)}`;
    case "antiguedad_anos":
      return `antiguedadAnos invalida: ${reason(error.cause.kind)}`;
    case "jornada_invalida":
      return `Jornada incoherente: ${reason(error.cause.kind)}`;
    case "jornada_tipo_desconocido":
      return `Tipo de jornada desconocido: ${error.raw}`;
    case "horas_nocturnas_exceden_base_anual":
      return `Las horas nocturnas (${error.horasNocturnas}) exceden el tope anual de ${error.tope} horas basado en ${error.horasSemanales}h/semana.`;
    default:
      return "Datos de entrada invalidos";
  }
}
