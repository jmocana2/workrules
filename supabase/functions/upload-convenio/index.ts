// supabase/functions/upload-convenio/index.ts
// Edge Function: POST /upload-convenio - Subida de convenios colectivos (Premium)

import { createClient } from "@supabase/supabase-js";
import { buildCorsHeaders } from "../_shared/lib/cors.ts";

// ============================================
// Types
// ============================================

interface UploadRequest {
  file_url: string;
  file_path: string;
  nombre_archivo: string;
  visibilidad: "publico" | "privado";
  pdf_hash?: string;
}

interface UploadResponse {
  convenio_id: string;
  status: "processing" | "error" | "duplicate";
  message?: string;
  existing_convenio?: {
    id: string;
    nombre: string;
  };
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Crea un cliente Supabase autenticado con el token del usuario
 */
function createAuthenticatedClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

/**
 * Limpia el nombre del archivo para usarlo como nombre del convenio
 */
function cleanFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .trim();
}

/**
 * Valida el request body
 */
function validateRequest(
  body: unknown,
): { valid: boolean; error?: string; data?: UploadRequest } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const { file_url, file_path, nombre_archivo, visibilidad, pdf_hash } =
    body as Record<string, unknown>;

  if (!file_url || typeof file_url !== "string") {
    return { valid: false, error: "file_url is required and must be a string" };
  }

  if (!file_path || typeof file_path !== "string") {
    return {
      valid: false,
      error: "file_path is required and must be a string",
    };
  }

  if (!nombre_archivo || typeof nombre_archivo !== "string") {
    return {
      valid: false,
      error: "nombre_archivo is required and must be a string",
    };
  }

  if (
    visibilidad !== "publico" && visibilidad !== "privado" &&
    visibilidad !== undefined
  ) {
    return {
      valid: false,
      error: "visibilidad must be 'publico' or 'privado'",
    };
  }

  // Validar hash si viene (64 caracteres hexadecimales)
  if (pdf_hash !== undefined && pdf_hash !== null) {
    if (typeof pdf_hash !== "string" || !/^[a-f0-9]{64}$/i.test(pdf_hash)) {
      return {
        valid: false,
        error: "pdf_hash must be a valid SHA-256 hash (64 hex characters)",
      };
    }
  }

  return {
    valid: true,
    data: {
      file_url,
      file_path,
      nombre_archivo,
      visibilidad: (visibilidad as "publico" | "privado") || "privado",
      pdf_hash: pdf_hash as string | undefined,
    },
  };
}

/**
 * Dispara el webhook de n8n para iniciar el procesamiento
 * Timeout de 5 segundos - el procesamiento real puede tardar minutos
 */
async function triggerN8nWebhook(payload: {
  convenio_id: string;
  pdf_url: string;
  nombre_archivo: string;
  visibilidad: string;
  owner_id: string;
}): Promise<void> {
  const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

  if (!n8nWebhookUrl) {
    console.warn("[upload-convenio] N8N_WEBHOOK_URL not configured");
    return;
  }

  // Reemplazar localhost por host.docker.internal para que n8n pueda acceder desde Docker
  let pdfUrl = payload.pdf_url;
  try {
    const parsedUrl = new URL(payload.pdf_url);
    if (parsedUrl.hostname === "localhost") {
      parsedUrl.hostname = "host.docker.internal";
      pdfUrl = parsedUrl.toString();
    }
  } catch {
    console.warn(
      "[upload-convenio] Could not parse pdf_url for localhost replacement",
    );
  }

  try {
    // Timeout de 5 segundos para el webhook
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, pdf_url: pdfUrl }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(
        `[upload-convenio] n8n webhook returned ${response.status}`,
      );
    } else {
      console.log(
        `[upload-convenio] Successfully triggered n8n for convenio ${payload.convenio_id}`,
      );
    }
  } catch (error) {
    // Si es timeout, está bien - el webhook se disparó correctamente
    if (error instanceof Error && error.name === "AbortError") {
      console.log(
        `[upload-convenio] n8n webhook timeout (expected) - processing continues in background`,
      );
    } else {
      console.error("[upload-convenio] Error calling n8n webhook:", error);
    }
    // No propagamos el error - el webhook es opcional
  }
}

/**
 * Comprobaciones de Capa 4 (premium + rate limit anti-ráfaga).
 * Devuelve una Response si hay que cortar; null si el usuario puede continuar.
 */
async function checkUploadGating(
  supabase: ReturnType<typeof createAuthenticatedClient>,
  userId: string,
  jsonHeaders: Record<string, string>,
): Promise<Response | null> {
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("[upload-convenio] Error reading user_profile:", profileError);
    return new Response(
      JSON.stringify({
        error: "Error verificando suscripción",
        details: profileError.message,
      } satisfies ErrorResponse),
      { status: 500, headers: jsonHeaders },
    );
  }

  const tier = profile?.subscription_tier ?? "free";
  if (tier !== "premium" && tier !== "enterprise") {
    return new Response(
      JSON.stringify({
        error: "La subida de convenios requiere suscripción premium",
      } satisfies ErrorResponse),
      { status: 403, headers: jsonHeaders },
    );
  }

  const RATE_LIMIT_WINDOW_MINUTES = 5;
  const RATE_LIMIT_MAX_UPLOADS = 5;

  const { data: recentCount, error: rateError } = await supabase.rpc(
    "count_recent_uploads",
    { p_user_id: userId, p_window_minutes: RATE_LIMIT_WINDOW_MINUTES },
  );

  if (rateError) {
    // Falla abierta: no bloqueamos por un error de conteo, solo logueamos.
    console.error("[upload-convenio] Error checking rate limit:", rateError);
    return null;
  }

  if (typeof recentCount === "number" && recentCount >= RATE_LIMIT_MAX_UPLOADS) {
    return new Response(
      JSON.stringify({
        error: `Has alcanzado el límite de ${RATE_LIMIT_MAX_UPLOADS} subidas en ${RATE_LIMIT_WINDOW_MINUTES} minutos. Inténtalo de nuevo en unos minutos.`,
      } satisfies ErrorResponse),
      { status: 429, headers: jsonHeaders },
    );
  }

  return null;
}

/**
 * Si el usuario ya subió un PDF con el mismo hash, devuelve la Response de duplicado.
 * Null si no hay duplicado (o no se proporcionó hash).
 */
async function checkDuplicateByHash(
  supabase: ReturnType<typeof createAuthenticatedClient>,
  userId: string,
  pdfHash: string | undefined,
  jsonHeaders: Record<string, string>,
): Promise<Response | null> {
  if (!pdfHash) return null;

  const { data: existingConvenio } = await supabase
    .from("convenios")
    .select("id, nombre")
    .eq("pdf_hash", pdfHash)
    .eq("owner_id", userId)
    .maybeSingle();

  if (!existingConvenio) return null;

  console.log(
    `[upload-convenio] Duplicate detected for user ${userId}: ${existingConvenio.nombre}`,
  );

  const duplicateResponse: UploadResponse = {
    convenio_id: existingConvenio.id,
    status: "duplicate",
    message: "Ya tienes un convenio con este PDF",
    existing_convenio: {
      id: existingConvenio.id,
      nombre: existingConvenio.nombre,
    },
  };

  return new Response(JSON.stringify(duplicateResponse), {
    status: 200,
    headers: jsonHeaders,
  });
}

// ============================================
// Edge Function Handler
// ============================================

async function handleRequest(req: Request, jsonHeaders: Record<string, string>): Promise<Response> {
  // ========================================
  // 1. Solo POST permitido
  // ========================================
  if (req.method !== "POST") {
    const errorResponse: ErrorResponse = { error: "Method not allowed" };
    return new Response(JSON.stringify(errorResponse), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    // ========================================
    // 3. Verificar autenticación
    // ========================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      const errorResponse: ErrorResponse = { error: "No autorizado" };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const supabase = createAuthenticatedClient(authHeader);

    // ========================================
    // 4. Obtener usuario del JWT
    // ========================================
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[upload-convenio] Auth error:", authError);
      const errorResponse: ErrorResponse = { error: "No autenticado" };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    // ========================================
    // 5. Gating Capa 4 (premium + rate limit anti-ráfaga)
    // ========================================
    const gatingResponse = await checkUploadGating(supabase, user.id, jsonHeaders);
    if (gatingResponse) return gatingResponse;

    // ========================================
    // 6. Parsear y validar request body
    // ========================================
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: "Invalid JSON",
        details: error instanceof Error ? error.message : String(error),
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const validation = validateRequest(body);
    if (!validation.valid) {
      const errorResponse: ErrorResponse = { error: validation.error! };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const { file_url, file_path, nombre_archivo, visibilidad, pdf_hash } =
      validation.data!;

    // Seguridad: el path debe estar dentro de la carpeta del usuario.
    // La RLS de storage.objects ya garantiza esto en el upload, pero
    // lo verificamos aquí también antes de persistir.
    if (!file_path.startsWith(`${user.id}/`)) {
      const errorResponse: ErrorResponse = {
        error: "file_path no pertenece al usuario autenticado",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    // ========================================
    // 7. Verificar duplicados por hash (si viene hash)
    // ========================================
    const duplicateResponse = await checkDuplicateByHash(
      supabase,
      user.id,
      pdf_hash,
      jsonHeaders,
    );
    if (duplicateResponse) return duplicateResponse;

    // ========================================
    // 8. Crear registro de convenio
    // ========================================
    const nombreLimpio = cleanFileName(nombre_archivo);

    const { data: convenio, error: insertError } = await supabase
      .from("convenios")
      .insert({
        nombre: nombreLimpio,
        url_pdf: file_path,
        pdf_hash: pdf_hash || null,
        visibilidad,
        owner_id: user.id,
        estado: "pendiente",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[upload-convenio] Error inserting convenio:", insertError);
      const errorResponse: ErrorResponse = {
        error: "Error creando convenio",
        details: insertError.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const convenioId = convenio.id;

    // ========================================
    // 8. Actualizar estado a "procesando" ANTES del webhook
    // ========================================
    const { error: updateError } = await supabase
      .from("convenios")
      .update({ estado: "procesando" })
      .eq("id", convenioId);

    if (updateError) {
      console.error(
        "[upload-convenio] Error updating estado:",
        updateError,
      );
      // No fallamos la request - el convenio se quedará en "pendiente"
    }

    // ========================================
    // 9. Disparar webhook a n8n
    // ========================================
    await triggerN8nWebhook({
      convenio_id: convenioId,
      pdf_url: file_url,
      nombre_archivo,
      visibilidad,
      owner_id: user.id,
    });

    // ========================================
    // 10. Responder con éxito
    // ========================================
    const successResponse: UploadResponse = {
      convenio_id: convenioId,
      status: "processing",
      message: "Convenio en cola de procesamiento",
    };

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("[upload-convenio] Unexpected error:", error);
    const errorResponse: ErrorResponse = {
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error),
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}

Deno.serve((req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return handleRequest(req, jsonHeaders);
});

/* To invoke locally:

  1. Start Supabase local environment:
     supabase start

  2. Get a valid JWT token (from your app's auth flow or supabase dashboard)

  3. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/upload-convenio' \
    --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
    --header 'Content-Type: application/json' \
    --data '{
      "file_url": "https://example.com/test.pdf",
      "nombre_archivo": "convenio-hosteleria-madrid.pdf",
      "visibilidad": "privado"
    }'

  Expected response:
  {
    "convenio_id": "uuid-here",
    "status": "processing",
    "message": "Convenio en cola de procesamiento"
  }
*/
