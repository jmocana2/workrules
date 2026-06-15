/**
 * Servicio de Anthropic con Streaming
 * Modelo: Claude Sonnet 4
 *
 * @module anthropic
 */

import Anthropic from "npm:@anthropic-ai/sdk";

// ============================================
// TIPOS
// ============================================

export interface StreamOptions {
  /** System prompt con instrucciones */
  systemPrompt: string;
  /** Mensaje del usuario (contexto + pregunta) */
  userMessage: string;
  /** Modelo a usar (default: claude-sonnet-4-5) */
  model?: string;
  /** Max tokens de respuesta (default: 2048) */
  maxTokens?: number;
  /** Temperature 0-1 (default: 0.3) */
  temperature?: number;
}

export type AnthropicErrorCode =
  | "INVALID_INPUT"
  | "API_ERROR"
  | "RATE_LIMIT"
  | "OVERLOADED"
  | "AUTH_ERROR";

export class AnthropicError extends Error {
  constructor(
    message: string,
    public code: AnthropicErrorCode,
    public retryable: boolean,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AnthropicError";
  }
}

// ============================================
// CONFIGURACION
// ============================================

const DEFAULT_MODEL = "claude-sonnet-4-5";
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.3;

// ============================================
// VALIDACION
// ============================================

/**
 * Valida las opciones de streaming
 */
export function validateOptions(options: unknown): StreamOptions {
  if (!options || typeof options !== "object") {
    throw new AnthropicError("Options object is required", "INVALID_INPUT", false);
  }

  const opts = options as Record<string, unknown>;

  if (!opts.systemPrompt || typeof opts.systemPrompt !== "string") {
    throw new AnthropicError("systemPrompt is required", "INVALID_INPUT", false);
  }

  if (!opts.userMessage || typeof opts.userMessage !== "string") {
    throw new AnthropicError("userMessage is required", "INVALID_INPUT", false);
  }

  if (opts.systemPrompt.trim().length === 0) {
    throw new AnthropicError("systemPrompt cannot be empty", "INVALID_INPUT", false);
  }

  if (opts.userMessage.trim().length === 0) {
    throw new AnthropicError("userMessage cannot be empty", "INVALID_INPUT", false);
  }

  return {
    systemPrompt: opts.systemPrompt as string,
    userMessage: opts.userMessage as string,
    model: (opts.model as string) || DEFAULT_MODEL,
    maxTokens: (opts.maxTokens as number) || DEFAULT_MAX_TOKENS,
    temperature: (opts.temperature as number) ?? DEFAULT_TEMPERATURE,
  };
}

// ============================================
// CLIENTE
// ============================================

/**
 * Obtener cliente de Anthropic
 */
function getAnthropicClient(): Anthropic {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!apiKey) {
    throw new AnthropicError(
      "Missing ANTHROPIC_API_KEY environment variable",
      "AUTH_ERROR",
      false,
    );
  }

  return new Anthropic({ apiKey });
}

// ============================================
// MANEJO DE ERRORES
// ============================================

/**
 * Mapea errores HTTP de Anthropic a AnthropicError
 */
function mapApiError(error: unknown): AnthropicError {
  // Error del SDK de Anthropic
  if (error instanceof Anthropic.APIError) {
    const status = error.status;
    const message = error.message || "Unknown API error";

    if (status === 401) {
      return new AnthropicError("Invalid API key", "AUTH_ERROR", false, error);
    }
    if (status === 429) {
      return new AnthropicError("Rate limit exceeded", "RATE_LIMIT", true, error);
    }
    if (status === 529) {
      return new AnthropicError("Anthropic API overloaded", "OVERLOADED", true, error);
    }
    if (status >= 500) {
      return new AnthropicError(`Server error: ${status}`, "API_ERROR", true, error);
    }
    if (status === 400) {
      return new AnthropicError(`Bad request: ${message}`, "INVALID_INPUT", false, error);
    }

    return new AnthropicError(message, "API_ERROR", false, error);
  }

  // Re-lanzar AnthropicError
  if (error instanceof AnthropicError) {
    return error;
  }

  // Error generico
  const message = error instanceof Error ? error.message : "Unknown error";
  return new AnthropicError(message, "API_ERROR", false, error);
}

// ============================================
// STREAMING
// ============================================

/**
 * Enviar mensaje a Claude con streaming
 *
 * @returns ReadableStream que emite chunks de texto plano
 * El formateo SSE se realiza en handlers.ts handleStreamResponse
 *
 * @example
 * const stream = await streamChatResponse({
 *   systemPrompt: "Eres un experto en convenios...",
 *   userMessage: "Cual es el salario base?",
 * });
 *
 * // Usar con handleStreamResponse para SSE
 * return handleStreamResponse(stream, cleanup, citations, headers);
 */
export async function streamChatResponse(
  options: StreamOptions,
): Promise<ReadableStream<Uint8Array>> {
  // 1. Validar opciones
  const validOptions = validateOptions(options);

  // 2. Obtener cliente
  const client = getAnthropicClient();

  // 3. Crear stream de Anthropic
  try {
    const stream = client.messages.stream({
      model: validOptions.model!,
      max_tokens: validOptions.maxTokens!,
      temperature: validOptions.temperature!,
      system: validOptions.systemPrompt,
      messages: [{ role: "user", content: validOptions.userMessage }],
    });

    // 4. Crear ReadableStream con texto plano (sin formato SSE)
    // El formateo SSE se hace en handlers.ts handleStreamResponse
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta") {
              const delta = event.delta;
              if ("text" in delta) {
                // Emitir texto plano sin formato SSE
                controller.enqueue(encoder.encode(delta.text));
              }
            }
            // message_stop ya no necesita evento especial,
            // el stream se cierra naturalmente
          }
          controller.close();
        } catch (error) {
          // En caso de error, lanzar para que el handler lo gestione
          const mapped = mapApiError(error);
          controller.error(mapped);
        }
      },
    });
  } catch (error) {
    throw mapApiError(error);
  }
}

// ============================================
// SIN STREAMING
// ============================================

/**
 * Enviar mensaje a Claude sin streaming
 * Util para tests o cuando no se necesita streaming
 *
 * @returns Respuesta completa como string
 */
export async function createChatResponse(options: StreamOptions): Promise<string> {
  // 1. Validar opciones
  const validOptions = validateOptions(options);

  // 2. Obtener cliente
  const client = getAnthropicClient();

  // 3. Llamar a la API sin streaming
  try {
    const response = await client.messages.create({
      model: validOptions.model!,
      max_tokens: validOptions.maxTokens!,
      temperature: validOptions.temperature!,
      system: validOptions.systemPrompt,
      messages: [{ role: "user", content: validOptions.userMessage }],
    });

    // 4. Extraer texto de la respuesta
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new AnthropicError("No text content in response", "API_ERROR", false, response);
    }

    return textContent.text;
  } catch (error) {
    throw mapApiError(error);
  }
}
