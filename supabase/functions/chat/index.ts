// supabase/functions/chat/index.ts
// Edge Function: POST /chat - Endpoint principal de WorkRules

import type { ChatRequest } from '../_shared/application/chat/types.ts';
import {
  validateChatRequest,
  parseRequestBody,
  extractUserIdFromRequest,
  classifyAndExecute,
  mapResultToHttpResponse,
  handleStreamResponse,
  buildErrorResponse,
  buildStatusStreamResponse,
} from '../_shared/application/chat/handlers.ts';
import { buildCorsHeaders } from '../_shared/lib/cors.ts';
import { countRecentChatRequests } from '../_shared/lib/supabase.ts';
import { supabasePerfilRepository } from '../_shared/infrastructure/supabase/perfil-repository.ts';

// Anti-ráfaga: máximo de preguntas por ventana corta
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 10;

// ============================================
// Edge Function Handler
// ============================================

function jsonResponse(
  response: { status: number; body: unknown },
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(response.body), {
    status: response.status,
    headers,
  });
}

async function checkRateLimit(
  userId: string,
  jsonHeaders: Record<string, string>,
): Promise<Response | null> {
  try {
    const recent = await countRecentChatRequests(
      userId,
      RATE_LIMIT_WINDOW_SECONDS,
    );
    if (recent >= RATE_LIMIT_MAX_REQUESTS) {
      return jsonResponse(
        buildErrorResponse(
          429,
          `Demasiadas preguntas en poco tiempo. Inténtalo de nuevo en unos segundos.`,
          {
            limit: RATE_LIMIT_MAX_REQUESTS,
            window_seconds: RATE_LIMIT_WINDOW_SECONDS,
          },
        ),
        jsonHeaders,
      );
    }
  } catch (rateError) {
    // Falla abierta: no bloqueamos por un error de conteo, solo logueamos.
    console.error('[chat] Error checking rate limit:', rateError);
  }
  return null;
}

async function parseAndValidateRequest(
  req: Request,
  jsonHeaders: Record<string, string>,
): Promise<{ request?: ChatRequest; errorResponse?: Response }> {
  const { data, error: parseError } = await parseRequestBody(req);
  if (parseError) {
    return {
      errorResponse: jsonResponse(buildErrorResponse(400, parseError), jsonHeaders),
    };
  }

  const validation = validateChatRequest(data);
  if (!validation.valid) {
    return {
      errorResponse: jsonResponse(
        buildErrorResponse(400, validation.error!, {
          ...(validation.fields && { required: validation.fields }),
        }),
        jsonHeaders,
      ),
    };
  }

  return { request: data as ChatRequest };
}

async function handleChatRequest(
  req: Request,
  jsonHeaders: Record<string, string>,
  sseHeaders: Record<string, string>,
): Promise<Response> {
  const userId = await extractUserIdFromRequest(req);
  if (!userId) {
    return jsonResponse(
      buildErrorResponse(401, 'Unauthorized', {
        hint: 'Include a valid Supabase Auth JWT in the Authorization header',
      }),
      jsonHeaders,
    );
  }

  const rateLimited = await checkRateLimit(userId, jsonHeaders);
  if (rateLimited) return rateLimited;

  const { request, errorResponse } = await parseAndValidateRequest(req, jsonHeaders);
  if (errorResponse) return errorResponse;

  const result = await classifyAndExecute(request!, userId, supabasePerfilRepository);

  if (result.type === 'stream') {
    return handleStreamResponse(
      result.stream,
      result.cleanup,
      result.citations,
      sseHeaders,
      result.resolvedVariables,
    );
  }

  if (
    request!.stream &&
    (result.type === 'incomplete_data' || result.type === 'invalid_data')
  ) {
    const statusResponse = buildStatusStreamResponse(result, sseHeaders);
    if (statusResponse) return statusResponse;
  }

  return jsonResponse(mapResultToHttpResponse(result), jsonHeaders);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('origin'));
  const jsonHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };
  const sseHeaders = {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(buildErrorResponse(405, 'Method not allowed'), jsonHeaders);
  }

  try {
    return await handleChatRequest(req, jsonHeaders, sseHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[chat] Unhandled error:', error);

    return jsonResponse(
      buildErrorResponse(500, 'Internal server error', {
        ...(Deno.env.get('ENVIRONMENT') !== 'production' && { details: errorMessage }),
      }),
      jsonHeaders,
    );
  }
});

/* ============================================
 * INVOCACION LOCAL
 * ============================================
 *
 * 1. Iniciar Supabase local:
 *    supabase start
 *
 * 2. Pregunta general:
 *    curl -X POST 'http://127.0.0.1:54321/functions/v1/chat' \
 *      -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
 *      -H 'Content-Type: application/json' \
 *      -d '{
 *        "convenio_id": "uuid-del-convenio",
 *        "pregunta": "Cuantos dias de vacaciones tengo?"
 *      }'
 *
 * 3. Calculo salarial:
 *    curl -X POST 'http://127.0.0.1:54321/functions/v1/chat' \
 *      -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
 *      -H 'Content-Type: application/json' \
 *      -d '{
 *        "convenio_id": "uuid-del-convenio",
 *        "pregunta": "Cuanto cobra un camarero en hotel 4 estrellas?"
 *      }'
 *
 * 4. Con streaming:
 *    curl -X POST 'http://127.0.0.1:54321/functions/v1/chat' \
 *      -H 'Authorization: Bearer ...' \
 *      -H 'Content-Type: application/json' \
 *      -d '{"convenio_id": "uuid", "pregunta": "Que dice el articulo 14?", "stream": true}' \
 *      -N
 *
 */
