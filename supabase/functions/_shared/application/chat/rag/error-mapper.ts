/**
 * Mapea errores de las librerías externas (OpenAI, Anthropic, Supabase) al
 * resultado tipado `AskQuestionError`. Función pura: no lanza, no hace I/O
 * más allá del `console.error` de observabilidad.
 *
 * El `logTag` distingue qué use case emitió el error (ask-question,
 * calculate-salary, etc.) sin obligar a cada uno a tener su propio mapper.
 */

import { AnthropicError } from "../../../lib/anthropic.ts";
import { EmbeddingError } from "../../../lib/openai.ts";
import { RepositoryError } from "../../../lib/supabase.ts";
import type { AskQuestionError } from "../ask-question/types.ts";

export interface HandleErrorOptions {
  /** Prefijo de log para observabilidad. Default: "ask-question". */
  logTag?: string;
}

export function handleError(
  error: unknown,
  { logTag = "ask-question" }: HandleErrorOptions = {},
): AskQuestionError {
  // Error de embedding (OpenAI)
  if (error instanceof EmbeddingError) {
    console.error(`[${logTag}] Embedding error:`, error.message);
    return {
      type: "error",
      message: "Error al procesar la pregunta. Intenta de nuevo.",
      code: `EMBEDDING_${error.code}`,
    };
  }

  // Error de Anthropic
  if (error instanceof AnthropicError) {
    console.error(`[${logTag}] Anthropic error:`, error.message);

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
    console.error(`[${logTag}] Repository error:`, error.message);
    return {
      type: "error",
      message: "Error de base de datos. Intenta de nuevo.",
      code: `DB_${error.code}`,
    };
  }

  // Error desconocido
  console.error(`[${logTag}] Unexpected error:`, error);
  return {
    type: "error",
    message: "Error interno del servidor.",
    code: "INTERNAL_ERROR",
  };
}
