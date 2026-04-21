// supabase/functions/upload-convenio/index.ts
// Edge Function: POST /upload-convenio - Subida de convenios colectivos (Premium)

import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/lib/cors.ts";

// ============================================
// Types
// ============================================

interface UploadRequest {
  file_url: string;
  nombre_archivo: string;
  visibilidad: "publico" | "privado";
}

interface UploadResponse {
  convenio_id: string;
  status: "processing" | "error";
  message?: string;
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

// ============================================
// Headers
// ============================================

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

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

  const { file_url, nombre_archivo, visibilidad } = body as Record<
    string,
    unknown
  >;

  if (!file_url || typeof file_url !== "string") {
    return { valid: false, error: "file_url is required and must be a string" };
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

  return {
    valid: true,
    data: {
      file_url,
      nombre_archivo,
      visibilidad: (visibilidad as "publico" | "privado") || "privado",
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

  try {
    // Timeout de 5 segundos para el webhook
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

// ============================================
// Edge Function Handler
// ============================================

Deno.serve(async (req: Request) => {
  // ========================================
  // 1. CORS preflight
  // ========================================
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ========================================
  // 2. Solo POST permitido
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
    // 5. Verificar que es usuario premium
    // ========================================
    // TODO: Implementar verificación real cuando se implemente el sistema de suscripciones
    // Por ahora, permitimos a todos los usuarios autenticados
    // const isPremium = await checkPremiumStatus(user.id);
    // if (!isPremium) {
    //   const errorResponse: ErrorResponse = { error: 'Requiere suscripción premium' };
    //   return new Response(JSON.stringify(errorResponse), {
    //     status: 403,
    //     headers: jsonHeaders,
    //   });
    // }

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

    const { file_url, nombre_archivo, visibilidad } = validation.data!;

    // ========================================
    // 7. Crear registro de convenio
    // ========================================
    const nombreLimpio = cleanFileName(nombre_archivo);

    const { data: convenio, error: insertError } = await supabase
      .from("convenios")
      .insert({
        nombre: nombreLimpio,
        url_pdf: file_url,
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
    // Reemplazar localhost por host.docker.internal para que n8n pueda acceder desde Docker
    let pdfUrlForN8n = file_url;
    try {
      const parsedUrl = new URL(file_url);
      if (parsedUrl.hostname === "localhost") {
        parsedUrl.hostname = "host.docker.internal";
        pdfUrlForN8n = parsedUrl.toString();
      }
    } catch {
      // If URL parsing fails, use original URL
      console.warn(
        "[upload-convenio] Could not parse file_url for localhost replacement",
      );
    }

    await triggerN8nWebhook({
      convenio_id: convenioId,
      pdf_url: pdfUrlForN8n,
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
