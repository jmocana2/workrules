// supabase/functions/chat/index.ts

import type { ChatRequest } from '../_shared/core/chat/types.ts';
import {
  validateChatRequest,
  parseRequestBody,
  processChatRequest,
  buildErrorResponse,
} from '../_shared/core/chat/handlers.ts';
import { corsHeaders } from '../_shared/lib/cors.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Solo POST permitido
    if (req.method !== 'POST') {
      const response = buildErrorResponse(405, 'Method not allowed');
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: jsonHeaders,
      });
    }

    // Parsear body
    const { data, error: parseError } = await parseRequestBody(req);
    if (parseError) {
      const response = buildErrorResponse(400, parseError);
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: jsonHeaders,
      });
    }

    // Validar request
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

    // Procesar chat (se reemplazará por RAG en I2.8)
    const chatResponse = processChatRequest(data as ChatRequest);
    return new Response(JSON.stringify(chatResponse.body), {
      status: chatResponse.status,
      headers: jsonHeaders,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Chat function error:', error);
    const response = buildErrorResponse(500, 'Internal server error', {
      details: Deno.env.get('ENVIRONMENT') === 'production' ? undefined : errorMessage,
    });
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: jsonHeaders,
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/chat' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"convenio_id":"66499","pregunta":"¿Cuántos días de vacaciones corresponden?","session_id":"test-session-123"}'

*/
