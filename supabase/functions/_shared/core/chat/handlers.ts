// supabase/functions/_shared/core/chat/handlers.ts

import { askQuestion } from "./ask-question.ts";
import {
  calculateSalary,
  isSalaryQuery,
} from "./calculate-salary/index.ts";
import type { ChatCitation, ChatRequest } from "./types.ts";
import { isShowRangesRequest } from "./variable-extractor.ts";
import type { ChatUseCaseResult } from "./http/result-mapper.ts";

// Re-exports de la capa HTTP (paso 1 del refactor)
export {
  parseRequestBody,
  validateChatRequest,
  type ValidationResult,
} from "./http/request-validator.ts";
export { extractUserIdFromRequest } from "./http/auth.ts";
export {
  buildErrorResponse,
  type ChatHandlerResponse,
} from "./http/error-response.ts";
export {
  type ChatUseCaseResult,
  mapResultToHttpResponse,
} from "./http/result-mapper.ts";

/**
 * Transforma una solicitud de "ver rangos/opciones" en una pregunta optimizada
 * para busqueda RAG de tablas salariales y clasificacion de establecimientos
 */
function transformRangesRequest(pregunta: string): string {
  const categoriaPatterns = [
    /para\s+([a-záéíóúñ][a-záéíóúñ\s]{2,30}?)(?:,|\s+muestrame|\s+en\s+el)/i,
    /(?:ayudante|jefe|cocinero|camarero|recepcionista|gobernanta|pinche|barman)[a-záéíóúñ\s]*/i,
  ];

  let categoria = "";
  for (const pattern of categoriaPatterns) {
    const match = pregunta.match(pattern);
    if (match) {
      categoria = (match[1] || match[0]).trim();
      categoria = categoria.replace(/^(un[ao]?\s+|la\s+|el\s+)/, "");
      if (categoria.length > 3 && categoria.length < 40) {
        break;
      }
      categoria = "";
    }
  }

  if (categoria) {
    return `Según el convenio, para la categoría de ${categoria}:
1. En que tipos de establecimiento puede trabajar (comedor, cafetería, bar, catering, etc)?
2. Qué clases de establecimiento existen (Lujo/A, Primera/B, Segunda/C)?
3. Cuál es el salario en cada combinación de tipo y clase?
Muestra una tabla organizada con todas las opciones y sus salarios correspondientes.`;
  }

  return `Según el convenio:
1. Cuáles son los tipos de establecimiento (comedor, cafetería, bar, catering, colectividades)?
2. Qué clases existen para cada tipo (Lujo, Primera, Segunda, Tercera)?
3. Cuáles son las categorías profesionales principales?
Muestra las opciones disponibles de forma organizada para que el usuario pueda elegir.`;
}

/**
 * Clasifica la consulta y ejecuta el UseCase apropiado
 */
export async function classifyAndExecute(
  request: ChatRequest,
  userId: string,
): Promise<ChatUseCaseResult> {
  if (request.mode === "salary") {
    return calculateSalary({
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
    });
  }

  if (isShowRangesRequest(request.pregunta)) {
    const transformedPregunta = transformRangesRequest(request.pregunta);

    return askQuestion({
      convenioId: request.convenio_id,
      pregunta: transformedPregunta,
      userId,
      sessionId: request.session_id,
      variables: request.variables,
      stream: request.stream,
      messages: request.messages,
    });
  }

  const isSalary = isSalaryQuery(request.pregunta);

  if (isSalary) {
    return calculateSalary({
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
    });
  }

  return askQuestion({
    convenioId: request.convenio_id,
    pregunta: request.pregunta,
    userId,
    sessionId: request.session_id,
    variables: request.variables,
    stream: request.stream,
    messages: request.messages,
  });
}

/**
 * Construye una respuesta SSE para estados especiales (incomplete/invalid/conflicting)
 * cuando el cliente pidió streaming.
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const statusEvent = `data: ${
        JSON.stringify({ type: "status", state, payload })
      }\n\n`;
      controller.enqueue(encoder.encode(statusEvent));

      if (assistantMessage && state !== "incomplete") {
        const textEvent = `data: ${
          JSON.stringify({ type: "text", content: assistantMessage })
        }\n\n`;
        controller.enqueue(encoder.encode(textEvent));
      }

      const shouldEmitCitations = state !== "incomplete";
      for (const citation of shouldEmitCitations ? citations : []) {
        const citationEvent = `data: ${
          JSON.stringify({
            type: "citation",
            articulo: citation.articulo,
            seccion: citation.seccion,
            url_pdf: citation.url_pdf,
            pagina: citation.pagina,
          })
        }\n\n`;
        controller.enqueue(encoder.encode(citationEvent));
      }

      const doneEvent = `data: ${
        JSON.stringify({
          type: "done",
          metadata: { response_length: assistantMessage.length },
        })
      }\n\n`;
      controller.enqueue(encoder.encode(doneEvent));
      controller.close();
    },
  });

  return new Response(stream, { headers });
}

/**
 * Transforma ReadableStream de Anthropic en SSE events
 */
export function handleStreamResponse(
  stream: ReadableStream<Uint8Array>,
  cleanup: (fullResponse: string) => Promise<void>,
  citations: ChatCitation[],
  headers: Record<string, string>,
  resolvedVariables?: Record<string, string>,
): Response {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let fullResponse = "";

  const transformedStream = stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        fullResponse += text;

        const sseEvent = `data: ${
          JSON.stringify({ type: "text", content: text })
        }\n\n`;
        controller.enqueue(encoder.encode(sseEvent));
      },
      flush(controller) {
        for (const citation of citations) {
          const citationEvent = `data: ${
            JSON.stringify({
              type: "citation",
              articulo: citation.articulo,
              seccion: citation.seccion,
              url_pdf: citation.url_pdf,
              pagina: citation.pagina,
            })
          }\n\n`;
          controller.enqueue(encoder.encode(citationEvent));
        }

        const doneEvent = `data: ${
          JSON.stringify({
            type: "done",
            metadata: {
              response_length: fullResponse.length,
              ...(resolvedVariables && Object.keys(resolvedVariables).length > 0
                ? { resolvedVariables }
                : {}),
            },
          })
        }\n\n`;
        controller.enqueue(encoder.encode(doneEvent));

        cleanup(fullResponse).catch((err) => {
          console.error("[handlers] Stream cleanup error:", err);
        });
      },
    }),
  );

  return new Response(transformedStream, { headers });
}
