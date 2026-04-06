// supabase/functions/_shared/core/chat/handlers.ts

import { verifyUserToken } from "../../lib/supabase.ts";
import { askQuestion, type AskQuestionResult } from "./ask-question.ts";
import {
  calculateSalary,
  type CalculateSalaryResult,
  isSalaryQuery,
} from "./calculate-salary.ts";
import type { ChatCitation, ChatMetadata, ChatRequest } from "./types.ts";
import { isShowRangesRequest } from "./variable-extractor.ts";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  fields?: string[];
}

export interface ChatHandlerResponse {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Valida el body de una petición de chat
 */
export function validateChatRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      error: "Invalid request body",
    };
  }

  const request = body as Partial<ChatRequest>;
  const missingFields: string[] = [];

  if (!request.convenio_id) {
    missingFields.push("convenio_id");
  }

  if (!request.pregunta) {
    missingFields.push("pregunta");
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: "Missing required fields",
      fields: missingFields,
    };
  }

  // Validar tipos
  if (typeof request.convenio_id !== "string") {
    return {
      valid: false,
      error: "convenio_id must be a string",
    };
  }

  if (typeof request.pregunta !== "string") {
    return {
      valid: false,
      error: "pregunta must be a string",
    };
  }

  // Validar longitud mínima de pregunta
  if (request.pregunta.trim().length < 3) {
    return {
      valid: false,
      error: "pregunta must be at least 3 characters",
    };
  }

  return { valid: true };
}

/**
 * Parsea el body de la request de forma segura
 */
export async function parseRequestBody(req: Request): Promise<{
  data: unknown;
  error?: string;
}> {
  try {
    const data = await req.json();
    return { data };
  } catch {
    return {
      data: null,
      error: "Invalid JSON body",
    };
  }
}

/**
 * Procesa una petición de chat válida
 * TODO: Implementar RAG completo en I2.8
 */
export function processChatRequest(request: ChatRequest): ChatHandlerResponse {
  return {
    status: 200,
    body: {
      status: "ok",
      message:
        `WorkRules chat operativo. Pregunta recibida para convenio ${request.convenio_id}`,
      data: {
        convenio_id: request.convenio_id,
        pregunta: request.pregunta,
        respuesta: "Hello World - Edge Function funcionando correctamente",
        version: "0.1.0",
      },
    },
  };
}

/**
 * Construye respuesta de error
 */
export function buildErrorResponse(
  status: number,
  error: string,
  details?: Record<string, unknown>,
): ChatHandlerResponse {
  return {
    status,
    body: {
      error,
      ...details,
    },
  };
}

// ============================================
// I2.8 - Funciones de integracion RAG
// ============================================

/** Resultado combinado de ambos UseCases */
export type ChatUseCaseResult = AskQuestionResult | CalculateSalaryResult;

/**
 * Extrae el userId del token JWT de Supabase Auth
 *
 * @param req - Request HTTP con header Authorization
 * @returns userId si el token es valido, null si no
 *
 * @example
 * const userId = await extractUserIdFromRequest(req);
 * if (!userId) return buildErrorResponse(401, 'Unauthorized');
 */
export async function extractUserIdFromRequest(
  req: Request,
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return null;
  }

  // Extraer token solo si el header cumple formato estricto "Bearer <token>"
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length);

  if (!token) {
    return null;
  }

  // Verificar token usando lib/supabase.ts
  return verifyUserToken(token);
}

/**
 * Transforma una solicitud de "ver rangos/opciones" en una pregunta optimizada
 * para busqueda RAG de tablas salariales y clasificacion de establecimientos
 *
 * @param pregunta - Pregunta original del usuario
 * @returns Pregunta transformada para busqueda de tablas
 */
function transformRangesRequest(pregunta: string): string {
  // Extraer posible categoria mencionada
  const categoriaPatterns = [
    /para\s+([a-záéíóúñ][a-záéíóúñ\s]{2,30}?)(?:,|\s+muestrame|\s+en\s+el)/i,
    /(?:ayudante|jefe|cocinero|camarero|recepcionista|gobernanta|pinche|barman)[a-záéíóúñ\s]*/i,
  ];

  let categoria = "";
  for (const pattern of categoriaPatterns) {
    const match = pregunta.match(pattern);
    if (match) {
      categoria = (match[1] || match[0]).trim();
      // Limpiar categoria
      categoria = categoria.replace(/^(un[ao]?\s+|la\s+|el\s+)/, "");
      if (categoria.length > 3 && categoria.length < 40) {
        break;
      }
      categoria = "";
    }
  }

  // Construir pregunta optimizada para RAG
  // El objetivo es que el usuario vea las OPCIONES disponibles para elegir
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
 *
 * @param request - Request de chat validada
 * @param userId - ID del usuario autenticado
 * @returns Resultado del UseCase (askQuestion o calculateSalary)
 *
 * @example
 * const result = await classifyAndExecute(request, userId);
 * if (result.type === 'stream') { ... }
 */
export async function classifyAndExecute(
  request: ChatRequest,
  userId: string,
): Promise<ChatUseCaseResult> {
  // Primero verificar si es solicitud de "ver todos los rangos"
  // Este caso especial transforma la pregunta para mejorar RAG
  if (isShowRangesRequest(request.pregunta)) {
    const transformedPregunta = transformRangesRequest(request.pregunta);

    // Usar askQuestion con la pregunta transformada
    // (no calculateSalary porque no hay variables que validar)
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

  // Clasificar: es calculo salarial o pregunta general?
  const isSalary = isSalaryQuery(request.pregunta);

  if (isSalary) {
    // Ejecutar caso de uso de calculo salarial
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

  // Ejecutar caso de uso de pregunta general
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
 * Mapea resultado del UseCase a respuesta HTTP
 *
 * @param result - Resultado de askQuestion o calculateSalary
 * @returns Objeto con status HTTP y body
 *
 * @example
 * const { status, body } = mapResultToHttpResponse(result);
 * return new Response(JSON.stringify(body), { status });
 */
export function mapResultToHttpResponse(
  result: ChatUseCaseResult,
): ChatHandlerResponse {
  switch (result.type) {
    // Respuestas exitosas -> 200
    case "success":
    case "cache_hit":
      return {
        status: 200,
        body: {
          status: "ok",
          respuesta: result.response,
          fuentes: result.citations,
          metadata: buildMetadata(result.metadata, "general"),
        },
      };

    case "salary_calculated":
      return {
        status: 200,
        body: {
          status: "ok",
          respuesta: result.response,
          fuentes: result.citations,
          desglose: result.desglose,
          metadata: buildMetadata(result.metadata, "salary"),
        },
      };

    // Datos incompletos -> 200 con status 'incomplete'
    case "incomplete_data":
      return {
        status: 200,
        body: {
          status: "incomplete",
          respuesta: result.message,
          missingVariables: result.missingVariables,
          suggestions: result.suggestions,
          metadata: {
            classification: "incomplete",
          },
        },
      };

    // Datos invalidos -> 400
    case "invalid_data":
      return {
        status: 400,
        body: {
          status: "error",
          error: result.message,
          invalidVariables: result.invalidVariables,
          conflictingVariables: result.conflictingVariables,
          metadata: {
            classification: "invalid",
          },
        },
      };

    // Cuota excedida -> 429
    case "quota_exceeded":
      return {
        status: 429,
        body: {
          status: "error",
          error: result.message,
        },
      };

    // No encontrado -> 404
    case "not_found":
      return {
        status: 404,
        body: {
          status: "error",
          error: result.message,
        },
      };

    // Error generico -> 500
    case "error":
      return {
        status: 500,
        body: {
          status: "error",
          error: result.message,
          code: result.code,
        },
      };

    // Stream se maneja diferente (no deberia llegar aqui)
    case "stream":
      return {
        status: 200,
        body: {
          status: "error",
          error: "Stream result should not be mapped to HTTP response",
        },
      };

    default:
      return {
        status: 500,
        body: {
          status: "error",
          error: "Unknown result type",
        },
      };
  }
}

/**
 * Construye metadata para la respuesta HTTP
 */
function buildMetadata(
  meta: {
    cacheHit: boolean;
    chunksUsed: number;
    model: string;
    latencyMs: number;
  },
  classification: "general" | "salary",
): ChatMetadata {
  return {
    model: meta.model,
    tokens_used: 0, // Se puede calcular despues si se necesita
    chunks_retrieved: meta.chunksUsed,
    cache_hit: meta.cacheHit,
    classification,
    latency_ms: meta.latencyMs,
  };
}

/**
 * Transforma ReadableStream de Anthropic en SSE events
 *
 * @param stream - Stream de respuesta de Anthropic
 * @param cleanup - Funcion a llamar al finalizar
 * @param citations - Citaciones para incluir en evento done
 * @returns Response con stream SSE
 */
export function handleStreamResponse(
  stream: ReadableStream<Uint8Array>,
  cleanup: (fullResponse: string) => Promise<void>,
  citations: ChatCitation[],
  headers: Record<string, string>,
): Response {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let fullResponse = "";

  const transformedStream = stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        // Decodificar chunk
        const text = decoder.decode(chunk, { stream: true });
        fullResponse += text;

        // Formatear como SSE
        const sseEvent = `data: ${
          JSON.stringify({ type: "text", content: text })
        }\n\n`;
        controller.enqueue(encoder.encode(sseEvent));
      },
      flush(controller) {
        // Enviar citaciones
        for (const citation of citations) {
          const citationEvent = `data: ${
            JSON.stringify({
              type: "citation",
              articulo: citation.articulo,
              seccion: citation.seccion,
            })
          }\n\n`;
          controller.enqueue(encoder.encode(citationEvent));
        }

        // Evento final
        const doneEvent = `data: ${
          JSON.stringify({
            type: "done",
            metadata: { response_length: fullResponse.length },
          })
        }\n\n`;
        controller.enqueue(encoder.encode(doneEvent));

        // Ejecutar cleanup (fire and forget)
        cleanup(fullResponse).catch((err) => {
          console.error("[handlers] Stream cleanup error:", err);
        });
      },
    }),
  );

  return new Response(transformedStream, { headers });
}
