// supabase/functions/webhook-progress/index.ts
// Recibe eventos de progreso desde n8n y los persiste en convenio_processing_status.
// Autenticación: header X-Webhook-Secret == env WEBHOOK_PROGRESS_SECRET.
// Escribe con SERVICE_ROLE para saltarse RLS (n8n no maneja JWT de usuario).

import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/lib/cors.ts";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const VALID_STAGES = new Set([
  "queued",
  "downloading",
  "parsing",
  "classifying",
  "saving_markdown",
  "chunking",
  "embedding",
  "profile",
  "completed",
  "failed",
]);

interface ProgressEvent {
  convenio_id: string;
  stage: string;
  progress: number;
  message?: string;
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function validate(body: unknown): { ok: true; data: ProgressEvent } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be an object" };
  const { convenio_id, stage, progress, message } = body as Record<string, unknown>;

  if (!isUuid(convenio_id)) return { ok: false, error: "convenio_id must be uuid" };
  if (typeof stage !== "string" || !VALID_STAGES.has(stage)) {
    return { ok: false, error: `stage must be one of: ${[...VALID_STAGES].join(", ")}` };
  }
  if (typeof progress !== "number" || progress < 0 || progress > 100) {
    return { ok: false, error: "progress must be number 0..100" };
  }
  if (message !== undefined && typeof message !== "string") {
    return { ok: false, error: "message must be string" };
  }

  return {
    ok: true,
    data: {
      convenio_id,
      stage,
      progress: Math.round(progress),
      message: (message as string | undefined),
    },
  };
}

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const expectedSecret = Deno.env.get("WEBHOOK_PROGRESS_SECRET");
  if (!expectedSecret) {
    console.error("[webhook-progress] WEBHOOK_PROGRESS_SECRET not configured");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  if (req.headers.get("X-Webhook-Secret") !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: jsonHeaders,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const v = validate(body);
  if (!v.ok) {
    return new Response(JSON.stringify({ error: v.error }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[webhook-progress] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabase
    .from("convenio_processing_status")
    .upsert(
      {
        convenio_id: v.data.convenio_id,
        stage: v.data.stage,
        progress: v.data.progress,
        message: v.data.message ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "convenio_id" },
    );

  if (error) {
    console.error("[webhook-progress] upsert error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: jsonHeaders,
  });
}

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return handle(req);
});
