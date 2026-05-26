// supabase/functions/chat/index.ts
// Edge Function: POST /chat - Endpoint principal de WorkRules

import type { ChatRequest } from '../_shared/core/chat/types.ts';
import {
  validateChatRequest,
  parseRequestBody,
  extractUserIdFromRequest,
  classifyAndExecute,
  mapResultToHttpResponse,
  handleStreamResponse,
  buildErrorResponse,
} from '../_shared/core/chat/handlers.ts';
import { buildCorsHeaders } from '../_shared/lib/cors.ts';
import { countRecentChatRequests } from '../_shared/lib/supabase.ts';

// Anti-ráfaga: máximo de preguntas por ventana corta
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 10;

// ============================================
// Edge Function Handler
// ============================================

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

  // ========================================
  // 1. CORS preflight
  // ========================================
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ========================================
  // 2. Solo POST permitido
  // ========================================
  if (req.method !== 'POST') {
    const response = buildErrorResponse(405, 'Method not allowed');
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: jsonHeaders,
    });
  }

  try {
    // ========================================
    // 3. Autenticacion
    // ========================================
    const userId = await extractUserIdFromRequest(req);

    if (!userId) {
      const response = buildErrorResponse(401, 'Unauthorized', {
        hint: 'Include a valid Supabase Auth JWT in the Authorization header',
      });
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: jsonHeaders,
      });
    }

    // ========================================
    // 3.b Rate limit anti-ráfaga
    // ========================================
    try {
      const recent = await countRecentChatRequests(
        userId,
        RATE_LIMIT_WINDOW_SECONDS,
      );
      if (recent >= RATE_LIMIT_MAX_REQUESTS) {
        const response = buildErrorResponse(
          429,
          `Demasiadas preguntas en poco tiempo. Inténtalo de nuevo en unos segundos.`,
          {
            limit: RATE_LIMIT_MAX_REQUESTS,
            window_seconds: RATE_LIMIT_WINDOW_SECONDS,
          },
        );
        return new Response(JSON.stringify(response.body), {
          status: response.status,
          headers: jsonHeaders,
        });
      }
    } catch (rateError) {
      // Falla abierta: no bloqueamos por un error de conteo, solo logueamos.
      console.error('[chat] Error checking rate limit:', rateError);
    }

    // ========================================
    // 4. Parsear body
    // ========================================
    const { data, error: parseError } = await parseRequestBody(req);

    if (parseError) {
      const response = buildErrorResponse(400, parseError);
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: jsonHeaders,
      });
    }

    // ========================================
    // 5. Validar request
    // ========================================
    const validation = validateChatRequest(data);

    if (!validation.valid) {
      const response = buildErrorResponse(400, validation.error!, {
        ...(validation.fields && { required: validation.fields }),
      });
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: jsonHeaders,
      });
    }

    const request = data as ChatRequest;

    // ========================================
    // 6. Ejecutar logica de negocio (RAG)
    // ========================================
    const result = await classifyAndExecute(request, userId);

    // ========================================
    // 7. Manejar streaming
    // ========================================
    if (result.type === 'stream') {
      // Para streaming, necesitamos obtener las citations despues
      // Por ahora enviamos array vacio y las citations en done event
      return handleStreamResponse(
        result.stream,
        result.cleanup,
        result.citations,
        sseHeaders
      );
    }

    // ========================================
    // 8. Respuesta JSON normal
    // ========================================
    const response = mapResultToHttpResponse(result);

    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: jsonHeaders,
    });

  } catch (error) {
    // ========================================
    // 9. Error handling global
    // ========================================
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[chat] Unhandled error:', error);

    const response = buildErrorResponse(500, 'Internal server error', {
      // Solo incluir detalles en desarrollo
      ...(Deno.env.get('ENVIRONMENT') !== 'production' && { details: errorMessage }),
    });

    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: jsonHeaders,
    });
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
