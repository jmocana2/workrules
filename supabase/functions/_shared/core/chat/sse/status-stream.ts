// supabase/functions/_shared/core/chat/sse/status-stream.ts

import type { ChatCitation } from "../types.ts";
import type { ChatUseCaseResult } from "../http/result-mapper.ts";
import { encodeCitation, encodeDone, encodeEvent } from "./sse-encoder.ts";

/**
 * Construye una respuesta SSE para estados especiales (incomplete/invalid/conflicting)
 * cuando el cliente pidió streaming. Emite un único evento `status` con la
 * clasificación + payload tal y como espera `useChatStream.onStatus`, y cierra
 * con `done`.
 */
export function buildStatusStreamResponse(
  result: ChatUseCaseResult,
  headers: Record<string, string>,
): Response | null {
  let state: "incomplete" | "invalid" | "conflicting" | null = null;
  let payload: Record<string, unknown> | null = null;
  let assistantMessage = "";
  let citations: ChatCitation[] = [];

  if (result.type === "incomplete_data") {
    state = "incomplete";
    payload = {
      missingVariables: result.missingVariables,
      suggestions: result.suggestions,
      ...(result.resolvedVariables &&
          Object.keys(result.resolvedVariables).length > 0
        ? { resolvedVariables: result.resolvedVariables }
        : {}),
    };
    assistantMessage = result.message;
    citations = result.citations ?? [];
  } else if (result.type === "invalid_data") {
    if (result.conflictingVariables && result.conflictingVariables.length > 0) {
      state = "conflicting";
      payload = {
        message: result.message,
        conflictingVariables: result.conflictingVariables,
      };
    } else {
      state = "invalid";
      payload = {
        message: result.message,
        invalidVariables: result.invalidVariables,
      };
    }
    assistantMessage = result.message;
    citations = result.citations ?? [];
  } else {
    return null;
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encodeEvent("status", { state, payload }));

      // Para `incomplete` el DataRequestCard ya muestra el mensaje; emitir además
      // el texto duplicaría la burbuja del asistente. Para `invalid`/`conflicting`
      // sí se emite: esos estados no tienen tarjeta equivalente.
      if (assistantMessage && state !== "incomplete") {
        controller.enqueue(
          encodeEvent("text", { content: assistantMessage }),
        );
      }

      // Emit citations salvo en `incomplete`: el DataRequestCard cubre la UX y
      // las citations aparecerán en el turno siguiente con la respuesta real.
      const shouldEmitCitations = state !== "incomplete";
      for (const citation of shouldEmitCitations ? citations : []) {
        controller.enqueue(encodeCitation(citation));
      }

      controller.enqueue(
        encodeDone({ response_length: assistantMessage.length }),
      );
      controller.close();
    },
  });

  return new Response(stream, { headers });
}
