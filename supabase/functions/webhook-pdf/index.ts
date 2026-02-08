// supabase/functions/webhook-pdf/index.ts

import { corsHeaders } from '../_shared/lib/cors.ts';
import { buildNotImplementedResponse } from './handlers.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

Deno.serve((_req: Request) => {
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // TODO: Implementar procesamiento de PDFs en Fase 3+
  // 1. Validar webhook payload
  // 2. Verificar que es un PDF
  // 3. Extraer convenio_id del path
  // 4. Trigger pipeline de procesamiento (n8n)

  const response = buildNotImplementedResponse();
  return new Response(JSON.stringify(response.body), {
    status: response.status,
    headers: jsonHeaders,
  });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/webhook-pdf' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
