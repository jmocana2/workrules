// supabase/functions/chat/index.ts

import type { ChatRequest } from '../_shared/core/chat/types.ts';
import { corsHeaders } from '../_shared/lib/cors.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Solo POST permitido
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parsear body
    const body: ChatRequest = await req.json();
    const { convenio_id, pregunta } = body;

    // Validacion basica
    if (!convenio_id || !pregunta) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['convenio_id', 'pregunta']
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Hello World response (se reemplazara por RAG en I2.8)
    return new Response(
      JSON.stringify({
        status: 'ok',
        message: `WorkRules chat operativo. Pregunta recibida para convenio ${convenio_id}`,
        data: {
          convenio_id,
          pregunta,
          respuesta: 'Hello World - Edge Function funcionando correctamente',
          version: '0.1.0'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Consider logging the full error server-side instead of exposing to client
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: Deno.env.get('ENVIRONMENT') === 'production' ? undefined : errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
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
