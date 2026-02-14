/**
 * Servicio de Embeddings con OpenAI
 * Modelo: text-embedding-3-small (1536 dimensiones)
 *
 * @module openai
 */

// ============================================
// TIPOS Y ERRORES
// ============================================

export type EmbeddingErrorCode =
  | "INVALID_INPUT"
  | "API_ERROR"
  | "RATE_LIMIT"
  | "TIMEOUT";

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public code: EmbeddingErrorCode,
    public retryable: boolean,
    public details?: unknown,
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

/** Respuesta de la API de OpenAI */
interface OpenAIEmbeddingResponse {
  object: "list";
  data: Array<{
    object: "embedding";
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// ============================================
// CONFIGURACION
// ============================================

const OPENAI_API_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_INPUT_TOKENS = 8000; // Margen del limite de 8191
const REQUEST_TIMEOUT_MS = 30000; // 30 segundos

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

// ============================================
// VALIDACION
// ============================================

/**
 * Valida y preprocesa el texto de entrada
 * - Rechaza texto vacio o null
 * - Elimina espacios innecesarios
 * - Trunca si excede limite de tokens (aproximado)
 */
export function validateInput(text: unknown): string {
  // Validar tipo
  if (text === null || text === undefined) {
    throw new EmbeddingError("Text is required", "INVALID_INPUT", false);
  }

  if (typeof text !== "string") {
    throw new EmbeddingError("Text must be a string", "INVALID_INPUT", false);
  }

  // Limpiar espacios
  const cleaned = text.trim();

  if (cleaned.length === 0) {
    throw new EmbeddingError("Text cannot be empty", "INVALID_INPUT", false);
  }

  // Truncar si es muy largo (aproximacion: 4 chars = 1 token)
  const estimatedTokens = Math.ceil(cleaned.length / 4);
  if (estimatedTokens > MAX_INPUT_TOKENS) {
    const maxChars = MAX_INPUT_TOKENS * 4;
    console.warn(
      `[openai] Input truncated from ${cleaned.length} to ${maxChars} chars`,
    );
    return cleaned.substring(0, maxChars);
  }

  return cleaned;
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Esperar N milisegundos
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcular delay con backoff exponencial
 */
function calculateBackoff(attempt: number): number {
  const delayMs = RETRY_CONFIG.initialDelayMs *
    Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delayMs, RETRY_CONFIG.maxDelayMs);
}

// ============================================
// FETCH CON RETRY
// ============================================

/** Verifica si debe reintentar */
function shouldRetry(attempt: number): boolean {
  return attempt < RETRY_CONFIG.maxRetries;
}

/** Log de reintento y espera */
async function logAndWait(reason: string, attempt: number): Promise<void> {
  const backoffMs = calculateBackoff(attempt);
  console.warn(
    `[openai] ${reason}. Retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} in ${backoffMs}ms`,
  );
  await delay(backoffMs);
}

/** Maneja respuesta HTTP no exitosa */
async function handleHttpError(
  response: Response,
  attempt: number,
  retry: () => Promise<Response>,
): Promise<Response> {
  const errorBody = await response.text().catch(() => "Unknown error");

  // Rate limit (429)
  if (response.status === 429) {
    if (shouldRetry(attempt)) {
      await logAndWait("Rate limited (429)", attempt);
      return retry();
    }
    throw new EmbeddingError("Rate limit exceeded after max retries", "RATE_LIMIT", false, {
      status: 429,
      body: errorBody,
    });
  }

  // Server error (5xx)
  if (response.status >= 500 && shouldRetry(attempt)) {
    await logAndWait(`Server error (${response.status})`, attempt);
    return retry();
  }

  // Otros errores - no reintentar
  throw new EmbeddingError(`OpenAI API error: ${response.status}`, "API_ERROR", false, {
    status: response.status,
    body: errorBody,
  });
}

/** Maneja errores de catch (timeout, red, etc) */
async function handleCatchError(
  error: unknown,
  attempt: number,
  retry: () => Promise<Response>,
): Promise<Response> {
  // Re-lanzar EmbeddingError
  if (error instanceof EmbeddingError) {
    throw error;
  }

  // Timeout (AbortError)
  if (error instanceof DOMException && error.name === "AbortError") {
    if (shouldRetry(attempt)) {
      await logAndWait("Timeout", attempt);
      return retry();
    }
    throw new EmbeddingError("Request timeout after max retries", "TIMEOUT", false);
  }

  // Error de red u otro
  if (shouldRetry(attempt)) {
    await logAndWait("Network error", attempt);
    return retry();
  }
  throw new EmbeddingError(
    `Network error: ${error instanceof Error ? error.message : "Unknown"}`,
    "API_ERROR",
    false,
    error,
  );
}

/**
 * Ejecutar fetch con timeout y retry automatico
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempt = 0,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const retry = () => fetchWithRetry(url, options, attempt + 1);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      return response;
    }
    return handleHttpError(response, attempt, retry);
  } catch (error) {
    clearTimeout(timeoutId);
    return handleCatchError(error, attempt, retry);
  }
}

// ============================================
// FUNCION PRINCIPAL
// ============================================

/**
 * Convertir texto a embedding de 1536 dimensiones
 *
 * @param text - Texto a convertir (pregunta del usuario)
 * @returns Array de 1536 numeros (embedding)
 * @throws EmbeddingError si falla la API o input invalido
 *
 * @example
 * const embedding = await embedQuestion("Cual es el salario de un camarero?");
 * console.log(embedding.length); // 1536
 */
export async function embedQuestion(text: string): Promise<number[]> {
  // 1. Validar input
  const validatedText = validateInput(text);

  // 2. Obtener API key
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new EmbeddingError(
      "Missing OPENAI_API_KEY environment variable",
      "API_ERROR",
      false,
    );
  }

  // 3. Preparar request
  const requestBody = {
    model: EMBEDDING_MODEL,
    input: validatedText,
  };

  // 4. Ejecutar con retry
  const response = await fetchWithRetry(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  // 5. Parsear respuesta
  const data: OpenAIEmbeddingResponse = await response.json();

  // 6. Validar respuesta
  if (!data.data || data.data.length === 0) {
    throw new EmbeddingError(
      "Empty response from OpenAI",
      "API_ERROR",
      true,
      data,
    );
  }

  const embedding = data.data[0].embedding;

  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new EmbeddingError(
      `Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length}`,
      "API_ERROR",
      false,
      data,
    );
  }

  return embedding;
}
