// supabase/functions/_shared/core/chat/http/error-response.ts

export interface ChatHandlerResponse {
  status: number;
  body: Record<string, unknown>;
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
