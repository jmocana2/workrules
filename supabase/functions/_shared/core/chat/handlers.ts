// supabase/functions/_shared/core/chat/handlers.ts

import type { ChatRequest } from './types.ts';

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
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: 'Invalid request body',
    };
  }

  const request = body as Partial<ChatRequest>;
  const missingFields: string[] = [];

  if (!request.convenio_id) {
    missingFields.push('convenio_id');
  }

  if (!request.pregunta) {
    missingFields.push('pregunta');
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: 'Missing required fields',
      fields: missingFields,
    };
  }

  // Validar tipos
  if (typeof request.convenio_id !== 'string') {
    return {
      valid: false,
      error: 'convenio_id must be a string',
    };
  }

  if (typeof request.pregunta !== 'string') {
    return {
      valid: false,
      error: 'pregunta must be a string',
    };
  }

  // Validar longitud mínima de pregunta
  if (request.pregunta.trim().length < 3) {
    return {
      valid: false,
      error: 'pregunta must be at least 3 characters',
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
      error: 'Invalid JSON body',
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
      status: 'ok',
      message: `WorkRules chat operativo. Pregunta recibida para convenio ${request.convenio_id}`,
      data: {
        convenio_id: request.convenio_id,
        pregunta: request.pregunta,
        respuesta: 'Hello World - Edge Function funcionando correctamente',
        version: '0.1.0',
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
  details?: Record<string, unknown>
): ChatHandlerResponse {
  return {
    status,
    body: {
      error,
      ...details,
    },
  };
}
