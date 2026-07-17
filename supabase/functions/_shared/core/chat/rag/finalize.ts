/**
 * Finaliza una respuesta LLM: la persiste en la cache semántica, la guarda en
 * el historial de chat y contabiliza la consulta en la cuota del usuario.
 *
 * Semántica preservada del código original:
 *   - `saveToSemanticCache` y `saveChatMessage` son **fire-and-forget**: sus
 *     errores se loguean pero nunca bloquean ni rompen la respuesta al usuario.
 *   - `incrementQueryCount` **sí se espera** (`await`): la cuota es crítica
 *     para no permitir consultas por encima del plan del usuario.
 *
 * `sequentialMessages` reproduce la diferencia que existía entre las dos ramas
 * del orquestador antes del refactor:
 *   - `false` (rama streaming): user y assistant se disparan en paralelo.
 *   - `true` (rama no-streaming): user primero y, tras completarse, assistant,
 *     para garantizar orden en el historial.
 *
 * `logTag` prefija todos los logs de este módulo para que cada use case
 * (ask-question, calculate-salary, ...) se identifique en observabilidad.
 */

import type { ChatCitation } from "../types.ts";
import type { AskQuestionDeps } from "../ask-question/types.ts";

/**
 * Sub-conjunto de dependencias que `persistResponse` realmente necesita.
 * Cualquier `Deps` de use case que cumpla estas tres capacidades vale — así
 * este módulo lo reutilizan otros use cases sin heredar `AskQuestionDeps`
 * completa.
 */
export type PersistResponseDeps = Pick<
  AskQuestionDeps,
  "saveToSemanticCache" | "saveChatMessage" | "incrementQueryCount"
>;

export interface PersistResponseParams {
  deps: PersistResponseDeps;
  embedding: number[];
  question: string;
  response: string;
  convenioId: string;
  citations: ChatCitation[];
  sessionId: string | undefined;
  userId: string;
  /** Prefijo de log. Ej: "ask-question", "calculate-salary". */
  logTag: string;
  /** Si true, guarda user antes que assistant secuencialmente. */
  sequentialMessages: boolean;
}

export async function persistResponse(params: PersistResponseParams): Promise<void> {
  const {
    deps,
    embedding,
    question,
    response,
    convenioId,
    citations,
    sessionId,
    userId,
    logTag,
    sequentialMessages,
  } = params;

  // Cache semántica: fire and forget.
  // TODO: envolver en EdgeRuntime.waitUntil(...) para evitar que el Edge
  // Runtime termine la instancia antes de que la escritura complete.
  // Aplica también a saveChatMessage más abajo. Bug preexistente al refactor.
  deps.saveToSemanticCache(
    embedding,
    question,
    response,
    convenioId,
    citations as unknown as Record<string, unknown>[],
  ).catch((err) => {
    console.error(`[${logTag}] Error saving to cache:`, err);
  });

  // Historial: fire and forget, respetando el orden pedido.
  if (sessionId) {
    if (sequentialMessages) {
      deps.saveChatMessage(sessionId, "user", question)
        .then(() => deps.saveChatMessage(sessionId, "assistant", response))
        .catch((err) => {
          console.error(`[${logTag}] Error saving chat messages:`, err);
        });
    } else {
      deps.saveChatMessage(sessionId, "user", question).catch((err) => {
        console.error(`[${logTag}] Error saving user message:`, err);
      });
      deps.saveChatMessage(sessionId, "assistant", response).catch((err) => {
        console.error(`[${logTag}] Error saving assistant message:`, err);
      });
    }
  }

  // Contador de cuota: crítico, sí se espera y se loguea si falla.
  try {
    await deps.incrementQueryCount(userId);
  } catch (err) {
    console.error(`[${logTag}] Error incrementing query count:`, err);
  }
}
