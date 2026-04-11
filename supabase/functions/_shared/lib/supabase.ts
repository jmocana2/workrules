// supabase/functions/_shared/lib/supabase.ts
// Repository para operaciones de base de datos (PostgreSQL + pgvector)

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// Types
// ============================================

/** Resultado de busqueda de chunks */
export interface ChunkSearchResult {
  chunk_id: string;
  convenio_id: string;
  contenido: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

/** Cache hit */
export interface CacheHit {
  cache_id: string;
  response: string;
  similarity: number;
  hit_count: number;
}

/** Estado de cuota de usuario */
export interface QuotaStatus {
  hasQuota: boolean;
  used: number;
  limit: number;
  tier: "free" | "premium" | "enterprise";
}

/** Datos basicos de convenio */
export interface Convenio {
  id: string;
  nombre: string;
  codigo_regcon: string;
  ambito: string;
  fecha_vigencia: string;
  estado: string;
}

/** Codigos de error del repository */
export type RepositoryErrorCode =
  | "NOT_FOUND"
  | "DB_ERROR"
  | "QUOTA_EXCEEDED"
  | "INVALID_INPUT"
  | "CONFIG_ERROR";

// ============================================
// RepositoryError
// ============================================

/**
 * Error personalizado para operaciones de repository
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public code: RepositoryErrorCode,
    public details?: unknown,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

// ============================================
// Validation helpers (pure functions - testable)
// ============================================

/**
 * Valida que un embedding tenga las dimensiones correctas
 */
export function validateEmbedding(embedding: unknown): {
  valid: boolean;
  error?: string;
} {
  if (!embedding) {
    return { valid: false, error: "Embedding is required" };
  }

  if (!Array.isArray(embedding)) {
    return { valid: false, error: "Embedding must be an array" };
  }

  if (embedding.length !== 1536) {
    return {
      valid: false,
      error: `Embedding must have 1536 dimensions, got ${embedding.length}`,
    };
  }

  // Verificar que todos los elementos son numeros
  const allNumbers = embedding.every(
    (n) => typeof n === "number" && !isNaN(n),
  );
  if (!allNumbers) {
    return { valid: false, error: "Embedding must contain only numbers" };
  }

  return { valid: true };
}

/**
 * Valida un UUID
 */
export function validateUUID(id: unknown, fieldName: string): {
  valid: boolean;
  error?: string;
} {
  if (!id) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof id !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  // UUID v4 pattern (loose validation)
  const uuidPattern =
    /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
  if (!uuidPattern.test(id)) {
    return { valid: false, error: `${fieldName} must be a valid UUID` };
  }

  return { valid: true };
}

/**
 * Valida un string no vacio
 */
export function validateNonEmptyString(
  value: unknown,
  fieldName: string,
): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  if (value.trim().length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }

  return { valid: true };
}

/**
 * Valida una clausula `select` de PostgREST antes de enviarla al servidor.
 * Previene tokens truncados como `perfil_data-` o accesores JSON incompletos.
 */
export function validatePostgrestSelectClause(
  value: unknown,
): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: false, error: "select clause is required" };
  }

  if (typeof value !== "string") {
    return { valid: false, error: "select clause must be a string" };
  }

  const selectClause = value.trim();
  if (selectClause.length === 0) {
    return { valid: false, error: "select clause cannot be empty" };
  }

  const lastChar = selectClause[selectClause.length - 1];
  if (lastChar === "," || lastChar === "-") {
    return {
      valid: false,
      error: `select clause cannot end with "${lastChar}"`,
    };
  }

  if (/(->>?)(\s*(,|$))/.test(selectClause)) {
    return {
      valid: false,
      error: "select clause has an incomplete JSON accessor",
    };
  }

  return { valid: true };
}

function getValidatedSelectClause<const T extends string>(
  selectClause: T,
): T {
  const normalized = selectClause.trim();
  const validation = validatePostgrestSelectClause(normalized);
  if (!validation.valid) {
    throw new RepositoryError(validation.error!, "INVALID_INPUT");
  }

  return normalized as T;
}

// ============================================
// Supabase Client
// ============================================

let _supabaseClient: SupabaseClient | null = null;

/**
 * Obtener cliente Supabase (singleton)
 * Permite inyectar cliente para testing
 */
export function getSupabaseClient(
  injectedClient?: SupabaseClient,
): SupabaseClient {
  if (injectedClient) {
    return injectedClient;
  }

  if (_supabaseClient) {
    return _supabaseClient;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new RepositoryError(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
      "CONFIG_ERROR",
    );
  }

  _supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  return _supabaseClient;
}

/**
 * Reset del cliente (para testing)
 */
export function resetSupabaseClient(): void {
  _supabaseClient = null;
}

// ============================================
// Repository Functions
// ============================================

/**
 * Buscar chunks relevantes por convenio_id
 * Usa la funcion DB search_chunks_by_convenio
 */
export async function searchChunksByConvenio(
  embedding: number[],
  convenioId: string,
  limit = 5,
  threshold = 0.7,
  client?: SupabaseClient,
): Promise<ChunkSearchResult[]> {
  // Validar inputs
  const embeddingValidation = validateEmbedding(embedding);
  if (!embeddingValidation.valid) {
    throw new RepositoryError(
      embeddingValidation.error!,
      "INVALID_INPUT",
    );
  }

  const uuidValidation = validateUUID(convenioId, "convenioId");
  if (!uuidValidation.valid) {
    throw new RepositoryError(uuidValidation.error!, "INVALID_INPUT");
  }

  const supabase = getSupabaseClient(client);

  const { data, error } = await supabase.rpc("search_chunks_by_convenio", {
    query_embedding: embedding,
    p_convenio_id: convenioId,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    throw new RepositoryError(
      `Error searching chunks: ${error.message}`,
      "DB_ERROR",
      error,
    );
  }

  return data || [];
}

/**
 * Obtener perfil JSON de un convenio
 */
export async function getPerfilByConvenio(
  convenioId: string,
  client?: SupabaseClient,
): Promise<Record<string, unknown> | null> {
  const uuidValidation = validateUUID(convenioId, "convenioId");
  if (!uuidValidation.valid) {
    throw new RepositoryError(uuidValidation.error!, "INVALID_INPUT");
  }

  const supabase = getSupabaseClient(client);

  const { data, error } = await supabase
    .from("convenio_perfiles")
    .select(getValidatedSelectClause("perfil_data"))
    .eq("convenio_id", convenioId)
    .maybeSingle();

  if (error) {
    throw new RepositoryError(
      `Error fetching perfil: ${error.message}`,
      "DB_ERROR",
      error,
    );
  }

  return data?.perfil_data || null;
}

/**
 * Obtener datos basicos de un convenio
 */
export async function getConvenioById(
  convenioId: string,
  client?: SupabaseClient,
): Promise<Convenio | null> {
  const uuidValidation = validateUUID(convenioId, "convenioId");
  if (!uuidValidation.valid) {
    throw new RepositoryError(uuidValidation.error!, "INVALID_INPUT");
  }

  const supabase = getSupabaseClient(client);

  const { data, error } = await supabase
    .from("convenios")
    .select(
      getValidatedSelectClause(
        "id, nombre, codigo_regcon, ambito, fecha_vigencia, estado",
      ),
    )
    .eq("id", convenioId)
    .maybeSingle();

  if (error) {
    throw new RepositoryError(
      `Error fetching convenio: ${error.message}`,
      "DB_ERROR",
      error,
    );
  }

  return data;
}

/**
 * Buscar en cache semantico
 */
export async function searchSemanticCache(
  embedding: number[],
  convenioId: string,
  threshold = 0.95,
  client?: SupabaseClient,
): Promise<CacheHit | null> {
  const embeddingValidation = validateEmbedding(embedding);
  if (!embeddingValidation.valid) {
    throw new RepositoryError(
      embeddingValidation.error!,
      "INVALID_INPUT",
    );
  }

  const convenioValidation = validateUUID(convenioId, "convenioId");
  if (!convenioValidation.valid) {
    throw new RepositoryError(convenioValidation.error!, "INVALID_INPUT");
  }

  const supabase = getSupabaseClient(client);

  const { data, error } = await supabase.rpc("search_semantic_cache", {
    p_query_embedding: embedding,
    similarity_threshold: threshold,
    p_convenio_id: convenioId,
  });

  if (error) {
    throw new RepositoryError(
      `Error searching cache: ${error.message}`,
      "DB_ERROR",
      error,
    );
  }

  // La funcion retorna array, tomamos el primero si existe
  if (data && data.length > 0) {
    const hit = data[0];

    // Actualizar hit_count y last_hit_at (fire and forget)
    supabase
      .from("semantic_cache")
      .update({
        hit_count: hit.hit_count + 1,
        last_hit_at: new Date().toISOString(),
        // Extender expiracion en cada hit (30 dias)
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .eq("id", hit.cache_id)
      .then(() => {
        // Fire and forget - no esperamos resultado
      });

    return {
      cache_id: hit.cache_id,
      response: hit.cached_response,
      similarity: hit.similarity,
      hit_count: hit.hit_count + 1,
    };
  }

  return null;
}

/**
 * Guardar respuesta en cache semantico
 */
export async function saveToSemanticCache(
  embedding: number[],
  query: string,
  response: string,
  convenioId: string,
  tokensUsed = 0,
  client?: SupabaseClient,
): Promise<void> {
  const embeddingValidation = validateEmbedding(embedding);
  if (!embeddingValidation.valid) {
    throw new RepositoryError(
      embeddingValidation.error!,
      "INVALID_INPUT",
    );
  }

  const queryValidation = validateNonEmptyString(query, "query");
  if (!queryValidation.valid) {
    throw new RepositoryError(queryValidation.error!, "INVALID_INPUT");
  }

  const responseValidation = validateNonEmptyString(response, "response");
  if (!responseValidation.valid) {
    throw new RepositoryError(responseValidation.error!, "INVALID_INPUT");
  }

  const convenioValidation = validateUUID(convenioId, "convenioId");
  if (!convenioValidation.valid) {
    throw new RepositoryError(convenioValidation.error!, "INVALID_INPUT");
  }

  const supabase = getSupabaseClient(client);

  const { error } = await supabase.from("semantic_cache").insert({
    query_embedding: embedding,
    query_text: query,
    response: response,
    convenio_id: convenioId,
    tokens_saved: tokensUsed,
    hit_count: 1,
    expires_at: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  });

  if (error) {
    // Log pero no fallar - el cache es optimizacion, no critico
    console.error("Error saving to cache:", error);
  }
}

/**
 * Obtener o crear sesion de chat
 */
export async function getOrCreateChatSession(
  userId: string,
  convenioId: string,
  title?: string,
  client?: SupabaseClient,
): Promise<string> {
  const userValidation = validateUUID(userId, "userId");
  if (!userValidation.valid) {
    throw new RepositoryError(userValidation.error!, "INVALID_INPUT");
  }

  const convenioValidation = validateUUID(convenioId, "convenioId");
  if (!convenioValidation.valid) {
    throw new RepositoryError(convenioValidation.error!, "INVALID_INPUT");
  }

  const supabase = getSupabaseClient(client);

  // Buscar sesion existente reciente (ultimas 24h)
  const { data: existing, error: lookupError } = await supabase
    .from("chat_sessions")
    .select(getValidatedSelectClause("id"))
    .eq("user_id", userId)
    .eq("convenio_id", convenioId)
    .gte(
      "created_at",
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    throw new RepositoryError(
      `Failed to lookup existing session: ${lookupError.message}`,
      "DB_ERROR",
    );
  }

  if (existing) {
    return existing.id;
  }

  // Crear nueva sesion
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_id: userId,
      convenio_id: convenioId,
      title: title || "Nueva consulta",
    })
    .select(getValidatedSelectClause("id"))
    .single();

  if (error) {
    throw new RepositoryError(
      `Error creating chat session: ${error.message}`,
      "DB_ERROR",
      error,
    );
  }

  return data.id;
}

/**
 * Guardar mensaje en historial de chat
 */
export async function saveChatMessage(
  sessionId: string,
  role: "user" | "assistant" | "system",
  content: string,
  metadata?: Record<string, unknown>,
  client?: SupabaseClient,
): Promise<void> {
  const sessionValidation = validateUUID(sessionId, "sessionId");
  if (!sessionValidation.valid) {
    throw new RepositoryError(sessionValidation.error!, "INVALID_INPUT");
  }

  const contentValidation = validateNonEmptyString(content, "content");
  if (!contentValidation.valid) {
    throw new RepositoryError(contentValidation.error!, "INVALID_INPUT");
  }

  const validRoles = ["user", "assistant", "system"];
  if (!validRoles.includes(role)) {
    throw new RepositoryError(
      `role must be one of: ${validRoles.join(", ")}`,
      "INVALID_INPUT",
    );
  }

  const supabase = getSupabaseClient(client);

  const { error } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role,
    content,
    metadata: metadata || {},
  });

  if (error) {
    throw new RepositoryError(
      `Error saving message: ${error.message}`,
      "DB_ERROR",
      error,
    );
  }
}

/**
 * Verificar si el usuario tiene cuota disponible
 */
export async function checkUserQuota(
  userId: string,
  client?: SupabaseClient,
): Promise<QuotaStatus> {
  const userValidation = validateUUID(userId, "userId");
  if (!userValidation.valid) {
    throw new RepositoryError(userValidation.error!, "INVALID_INPUT");
  }

  const supabase = getSupabaseClient(client);

  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      getValidatedSelectClause(
        "subscription_tier, monthly_queries_used, monthly_query_limit",
      ),
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new RepositoryError(
      `Error checking quota: ${error.message}`,
      "DB_ERROR",
      error,
    );
  }

  // Si no existe el perfil, es usuario nuevo con tier free
  if (!data) {
    return {
      hasQuota: true, // Primera consulta gratis
      used: 0,
      limit: 5,
      tier: "free",
    };
  }

  const limit = data.monthly_query_limit;
  const used = data.monthly_queries_used;
  const tier = data.subscription_tier as "free" | "premium" | "enterprise";

  // Premium tiene limite -1 (ilimitado)
  const hasQuota = limit === -1 || used < limit;

  return {
    hasQuota,
    used,
    limit: limit === -1 ? Infinity : limit,
    tier,
  };
}

/**
 * Incrementar contador de uso
 * Retorna true si tiene cuota, false si excedido
 */
export async function incrementQueryCount(
  userId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const userValidation = validateUUID(userId, "userId");
  if (!userValidation.valid) {
    throw new RepositoryError(userValidation.error!, "INVALID_INPUT");
  }

  const supabase = getSupabaseClient(client);

  const { data, error } = await supabase.rpc("increment_query_count", {
    p_user_id: userId,
  });

  if (error) {
    throw new RepositoryError(
      `Error incrementing query count: ${error.message}`,
      "DB_ERROR",
      error,
    );
  }

  return data === true;
}

/**
 * Verifica un token JWT de Supabase Auth y extrae el userId
 *
 * @param token - Token JWT del header Authorization
 * @returns userId si el token es valido, null si no
 */
export async function verifyUserToken(
  token: string,
): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return null;
  }

  try {
    // Crear cliente con el token del usuario
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    // Verificar el token obteniendo el usuario
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error("[supabase] Auth error:", error?.message);
      return null;
    }

    return user.id;
  } catch (error) {
    console.error("[supabase] Error verifying token:", error);
    return null;
  }
}
