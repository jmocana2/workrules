/**
 * chat-api.ts - Cliente para el endpoint /chat de Supabase Edge Functions
 *
 * Proporciona:
 * - Transport personalizado para Vercel AI SDK
 * - Parseo de eventos SSE del backend WorkRules
 * - Autenticacion JWT automatica
 * - Deteccion de estados especiales del protocolo
 */

import { supabase } from "./supabase";

// ============================================================================
// Tipos
// ============================================================================

/** Formatos de eventos SSE del backend */
export interface SSETextEvent {
  type: "text";
  content: string;
}

export interface SSECitationEvent {
  type: "citation";
  articulo: string;
  seccion?: string;
  url?: string;
  url_pdf?: string | null;
  pagina?: number | null;
}

export interface SSEStatusEvent {
  type: "status";
  state: "incomplete" | "invalid" | "smi_alert" | "conflicting";
  payload: Record<string, unknown>;
}

export interface SSEDoneEvent {
  type: "done";
  metadata?: {
    response_length: number;
    /**
     * Variables resueltas en el turno con las claves crudas del perfil
     * (las mismas que usa el panel del frontend). Permite sincronizar los
     * chips activos con lo que el backend ha entendido del mensaje.
     */
    resolvedVariables?: Record<string, string>;
  };
}

export type SSEEvent =
  | SSETextEvent
  | SSECitationEvent
  | SSEStatusEvent
  | SSEDoneEvent;

/** Respuesta JSON del backend (modo sin streaming) */
export interface ChatApiResponse {
  status: "ok" | "incomplete" | "error";
  respuesta?: string;
  fuentes?: Array<{
    articulo: string;
    seccion?: string;
  }>;
  missingVariables?: string[];
  suggestions?: Record<string, string[]>;
  error?: string;
  metadata?: {
    model: string;
    cache_hit: boolean;
    classification: string;
    latency_ms: number;
  };
}

/** Mensaje del historial para enviar al backend */
export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/** Opciones para la llamada al chat */
export interface ChatApiOptions {
  convenioId: string;
  pregunta: string;
  sessionId?: string;
  variables?: Record<string, string | number>;
  stream?: boolean;
  signal?: AbortSignal;
  /** Historial de mensajes anteriores para contexto multi-turno */
  messages?: ChatHistoryMessage[];
  /** Modo forzado por el usuario. Sobrescribe la heuristica del backend. */
  mode?: "salary";
}

/** Callback para eventos de streaming */
export interface StreamCallbacks {
  onText?: (text: string) => void;
  onCitation?: (citation: SSECitationEvent) => void;
  onStatus?: (status: SSEStatusEvent) => void;
  onDone?: (metadata?: SSEDoneEvent["metadata"]) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Utilidades
// ============================================================================

/**
 * Obtiene el token JWT de la sesion actual de Supabase
 */
export async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Construye la URL del endpoint de chat
 */
export function getChatEndpoint(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL no está configurada");
  }
  return `${supabaseUrl}/functions/v1/chat`;
}

/**
 * Obtiene la anon key publica de Supabase para el header apikey
 */
function getSupabaseAnonKey(): string {
  const anonKeyFromVite = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const anonKeyFromProcess =
    (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env?.VITE_SUPABASE_ANON_KEY;

  const anonKey = anonKeyFromVite ?? anonKeyFromProcess;
  if (!anonKey) {
    throw new Error("VITE_SUPABASE_ANON_KEY no está configurada");
  }

  return anonKey;
}

/**
 * Headers comunes para llamadas al chat
 */
function buildChatHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "apikey": getSupabaseAnonKey(),
    "Authorization": `Bearer ${token}`,
  };
}

/**
 * Parsea una linea de evento SSE
 */
export function parseSSELine(line: string): SSEEvent | null {
  // Formato: data: {"type": "text", "content": "..."}
  if (!line.startsWith("data: ")) {
    return null;
  }

  const jsonStr = line.slice(6); // Quitar "data: "

  if (!jsonStr || jsonStr === "[DONE]") {
    return null;
  }

  try {
    const event = JSON.parse(jsonStr) as SSEEvent;
    return event;
  } catch {
    console.warn("[chat-api] Error parsing SSE line:", line);
    return null;
  }
}

// ============================================================================
// Cliente de Chat
// ============================================================================

/**
 * Procesa un evento SSE y dispara el callback correspondiente
 */
function dispatchSSEEvent(event: SSEEvent, callbacks: StreamCallbacks): void {
  const { onText, onCitation, onStatus, onDone } = callbacks;

  switch (event.type) {
    case "text":
      onText?.(event.content);
      break;
    case "citation":
      onCitation?.(event);
      break;
    case "status":
      onStatus?.(event);
      break;
    case "done":
      onDone?.(event.metadata);
      break;
  }
}

/**
 * Procesa una respuesta JSON (no streaming) y dispara callbacks
 */
function handleJsonResponse(
  json: ChatApiResponse,
  callbacks: StreamCallbacks,
): void {
  const { onText, onStatus, onDone } = callbacks;

  if (json.respuesta) {
    onText?.(json.respuesta);
  }

  if (json.status === "incomplete" && json.missingVariables) {
    onStatus?.({
      type: "status",
      state: "incomplete",
      payload: {
        missingVariables: json.missingVariables,
        suggestions: json.suggestions,
      },
    });
  }

  onDone?.();
}

/**
 * Lee y procesa el stream SSE
 */
async function processSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks: StreamCallbacks,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    // Procesar lineas completas
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Guardar linea incompleta

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const event = parseSSELine(trimmedLine);
      if (event) {
        dispatchSSEEvent(event, callbacks);
      }
    }
  }

  // Procesar buffer restante
  if (buffer.trim()) {
    const event = parseSSELine(buffer.trim());
    switch (event?.type) {
      case "text":
        callbacks.onText?.(event.content);
        break;
      case "citation":
        callbacks.onCitation?.(event);
        break;
      case "status":
        callbacks.onStatus?.(event);
        break;
      case "done":
        callbacks.onDone?.(event.metadata);
        break;
    }
  }
}

/**
 * Envia una pregunta al chat con streaming
 *
 * @example
 * ```ts
 * let fullText = '';
 * await streamChat({
 *   convenioId: 'uuid',
 *   pregunta: 'Cual es el periodo de prueba?',
 * }, {
 *   onText: (text) => fullText += text,
 *   onCitation: (cit) => console.log('Citation:', cit),
 *   onStatus: (status) => console.log('Status:', status.state),
 *   onDone: () => console.log('Final:', fullText),
 * });
 * ```
 */
export async function streamChat(
  options: ChatApiOptions,
  callbacks: StreamCallbacks = {},
): Promise<void> {
  const { convenioId, pregunta, sessionId, variables, signal, messages, mode } =
    options;
  const { onError } = callbacks;

  // Obtener token de auth
  const token = await getAuthToken();

  if (!token) {
    const error = new Error("No hay sesion activa. Por favor, inicia sesion.");
    onError?.(error);
    throw error;
  }

  const endpoint = getChatEndpoint();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: buildChatHeaders(token),
      body: JSON.stringify({
        convenio_id: convenioId,
        pregunta,
        session_id: sessionId,
        variables,
        stream: true,
        messages,
        ...(mode && { mode }),
      }),
      signal,
    });

    // Manejar errores HTTP
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = (errorBody as { error?: string }).error ||
        `Error ${response.status}`;
      const error = new ChatApiError(errorMessage, response.status, errorBody);
      onError?.(error);
      throw error;
    }

    // Verificar que es un stream
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("text/event-stream")) {
      // Respuesta JSON normal (no streaming)
      const json = await response.json() as ChatApiResponse;
      handleJsonResponse(json, callbacks);
      return;
    }

    // Procesar stream SSE
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No se pudo obtener el reader del stream");
    }

    await processSSEStream(reader, callbacks);
  } catch (error) {
    if (error instanceof ChatApiError) {
      throw error;
    }

    const wrappedError = error instanceof Error
      ? error
      : new Error("Error desconocido en la llamada al chat");

    onError?.(wrappedError);
    throw wrappedError;
  }
}

/**
 * Envia una pregunta al chat sin streaming (respuesta completa)
 */
export async function sendChat(
  options: Omit<ChatApiOptions, "stream">,
): Promise<ChatApiResponse> {
  const { convenioId, pregunta, sessionId, variables, signal, messages, mode } =
    options;

  const token = await getAuthToken();

  if (!token) {
    throw new ChatApiError(
      "No hay sesion activa. Por favor, inicia sesion.",
      401,
    );
  }

  const endpoint = getChatEndpoint();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: buildChatHeaders(token),
    body: JSON.stringify({
      convenio_id: convenioId,
      pregunta,
      session_id: sessionId,
      variables,
      stream: false,
      messages,
      ...(mode && { mode }),
    }),
    signal,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new ChatApiError(
      json.error || `Error ${response.status}`,
      response.status,
      json,
    );
  }

  return json as ChatApiResponse;
}

// ============================================================================
// Error personalizado
// ============================================================================

export class ChatApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ChatApiError";
  }

  /** Es error de autenticacion */
  get isAuthError(): boolean {
    return this.status === 401;
  }

  /** Es error de cuota excedida */
  get isQuotaError(): boolean {
    return this.status === 429;
  }

  /** Es error de convenio no encontrado */
  get isNotFoundError(): boolean {
    return this.status === 404;
  }

  /** Es error de datos invalidos */
  get isValidationError(): boolean {
    return this.status === 400;
  }
}
