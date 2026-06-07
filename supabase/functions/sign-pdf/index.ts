// supabase/functions/sign-pdf/index.ts
// Edge Function: POST /sign-pdf
// Genera una signed URL de corta duración (60s) para abrir el PDF de un convenio.
// Seguridad: doble RLS.
//   1. Lectura de la fila `convenios` con el JWT del usuario → solo ve públicos
//      activos, propios o de sistema. Si el SELECT no devuelve fila, 404.
//   2. Para convenios privados, firmamos con el mismo cliente autenticado, así
//      la policy de storage.objects vuelve a comprobar que el path está en la
//      carpeta del usuario (<auth.uid()>/...).
//   3. Para convenios públicos activos, firmamos con service role (los PDFs
//      públicos pueden estar en carpetas de otros owners; el SELECT del paso 1
//      ya garantizó que es público y activo).

import { createClient } from "@supabase/supabase-js";
import { buildCorsHeaders } from "../_shared/lib/cors.ts";

const SIGNED_URL_TTL_SECONDS = 60;
const BUCKET = "convenios-pdf";

interface SignRequest {
  convenio_id: string;
}

interface SignResponse {
  url: string;
  expires_in: number;
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

function createAuthenticatedClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, serviceKey);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
}

// En local, SUPABASE_URL dentro del edge runtime apunta a la red Docker
// (http://kong:8000), que el navegador no resuelve. Si está definida
// PUBLIC_SUPABASE_URL, reescribimos el host para que sea accesible desde
// el cliente. En producción ambas suelen coincidir y no hay cambio.
function rewriteHostForBrowser(signedUrl: string): string {
  const publicHost = Deno.env.get("PUBLIC_SUPABASE_URL");
  const internalHost = Deno.env.get("SUPABASE_URL");
  if (!publicHost || !internalHost || publicHost === internalHost) {
    return signedUrl;
  }
  try {
    const signedParsed = new URL(signedUrl);
    const publicParsed = new URL(publicHost);
    signedParsed.protocol = publicParsed.protocol;
    signedParsed.host = publicParsed.host;
    return signedParsed.toString();
  } catch (err) {
    console.warn("[sign-pdf] No se pudo reescribir host público:", err);
    return signedUrl;
  }
}

function pickSigner(
  convenio: { visibilidad: string | null; estado: string | null },
  authClient: ReturnType<typeof createAuthenticatedClient>,
) {
  // Privado → cliente del usuario (RLS de storage.objects vuelve a verificar
  // que el path está en su carpeta).
  // Público activo → service role (los públicos pueden estar en carpetas de
  // otros owners). El SELECT anterior ya garantizó visibilidad + estado.
  if (convenio.visibilidad === "publico" && convenio.estado === "activo") {
    return createServiceClient();
  }
  return authClient;
}

async function handleRequest(
  req: Request,
  jsonHeaders: Record<string, string>,
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" } satisfies ErrorResponse),
      { status: 405, headers: jsonHeaders },
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "No autorizado" } satisfies ErrorResponse),
      { status: 401, headers: jsonHeaders },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" } satisfies ErrorResponse),
      { status: 400, headers: jsonHeaders },
    );
  }

  const { convenio_id } = (body ?? {}) as Partial<SignRequest>;
  if (!isUuid(convenio_id)) {
    return new Response(
      JSON.stringify(
        { error: "convenio_id inválido" } satisfies ErrorResponse,
      ),
      { status: 400, headers: jsonHeaders },
    );
  }

  const supabase = createAuthenticatedClient(authHeader);

  // Verifica que el JWT es válido.
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "No autenticado" } satisfies ErrorResponse),
      { status: 401, headers: jsonHeaders },
    );
  }

  // Paso 1: leer la fila con el cliente autenticado.
  // La RLS de `convenios` solo deja ver públicos activos, propios o de sistema.
  const { data: convenio, error: selectError } = await supabase
    .from("convenios")
    .select("id, url_pdf, visibilidad, estado, owner_id")
    .eq("id", convenio_id)
    .maybeSingle();

  if (selectError) {
    console.error("[sign-pdf] Error leyendo convenio:", selectError);
    return new Response(
      JSON.stringify({
        error: "Error consultando convenio",
        details: selectError.message,
      } satisfies ErrorResponse),
      { status: 500, headers: jsonHeaders },
    );
  }

  if (!convenio || !convenio.url_pdf) {
    return new Response(
      JSON.stringify(
        { error: "Convenio no encontrado" } satisfies ErrorResponse,
      ),
      { status: 404, headers: jsonHeaders },
    );
  }

  const path = convenio.url_pdf as string;

  // Si la columna todavía guarda una URL absoluta (datos no migrados), la
  // devolvemos tal cual: el navegador la usará y, si está caducada, mostrará
  // el mismo error que antes; al menos no rompemos a usuarios con datos viejos.
  if (/^https?:\/\//i.test(path)) {
    return new Response(
      JSON.stringify({
        url: path,
        expires_in: 0,
      } satisfies SignResponse),
      { status: 200, headers: jsonHeaders },
    );
  }

  const signer = pickSigner(convenio, supabase);
  const { data: signed, error: signError } = await signer.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    console.error("[sign-pdf] Error firmando URL:", signError);
    return new Response(
      JSON.stringify({
        error: "No se pudo generar la URL del PDF",
        details: signError?.message,
      } satisfies ErrorResponse),
      { status: 403, headers: jsonHeaders },
    );
  }

  return new Response(
    JSON.stringify({
      url: rewriteHostForBrowser(signed.signedUrl),
      expires_in: SIGNED_URL_TTL_SECONDS,
    } satisfies SignResponse),
    { status: 200, headers: jsonHeaders },
  );
}

Deno.serve((req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return handleRequest(req, jsonHeaders);
});
