import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ============================================
// Tipos para el Chat
// ============================================

export interface ChatRequest {
  convenio_id: string;
  pregunta: string;
  session_id?: string;
  stream?: boolean;
}

export interface ChatSuccessResponse {
  status: "success" | "cached";
  respuesta: string;
  citaciones?: Array<{ article: string; url: string }>;
  cached?: boolean;
}

export interface ChatIncompleteResponse {
  status: "incomplete";
  missing_fields: string[];
  message: string;
  suggestions?: Record<string, string[]>;
}

export interface ChatErrorResponse {
  status: "error";
  error: string;
  code?: string;
}

export type ChatResponse =
  | ChatSuccessResponse
  | ChatIncompleteResponse
  | ChatErrorResponse;

// Eventos SSE del streaming
export interface SSETextEvent {
  type: "text";
  content: string;
}

export interface SSECitationEvent {
  type: "citation";
  article: string;
  url: string;
}

export interface SSEDoneEvent {
  type: "done";
  usage?: { input_tokens: number; output_tokens: number };
}

export type SSEEvent = SSETextEvent | SSECitationEvent | SSEDoneEvent;

// ============================================
// Helpers internos para SSE
// ============================================

function createTextEvent(data: unknown): SSETextEvent {
  const content =
    typeof data === "string" ? data : ((data as { content?: string }).content ?? JSON.stringify(data));
  return { type: "text", content };
}

function parseSSEEvent(eventType: string, dataStr: string): SSEEvent | null {
  // Ignorar marcador de fin
  if (dataStr === "[DONE]") return null;

  try {
    const data = JSON.parse(dataStr);

    switch (eventType) {
      case "text":
        return createTextEvent(data);
      case "citation":
        return { type: "citation", ...data } as SSECitationEvent;
      case "done":
        return { type: "done", usage: data.usage } as SSEDoneEvent;
      default:
        // Evento desconocido con content, tratarlo como texto
        if ((data as { content?: string }).content) {
          return { type: "text", content: (data as { content: string }).content };
        }
        return null;
    }
  } catch {
    // JSON invalido, tratar como texto plano
    return dataStr ? { type: "text", content: dataStr } : null;
  }
}

interface SSELineResult {
  event?: SSEEvent;
  newEventType?: string;
}

function processSSELine(line: string, currentEventType: string): SSELineResult {
  const trimmedLine = line.trim();

  if (trimmedLine.startsWith("event: ")) {
    return { newEventType: trimmedLine.slice(7).trim() };
  }

  if (trimmedLine.startsWith("data: ")) {
    const event = parseSSEEvent(currentEventType, trimmedLine.slice(6));
    return { event: event ?? undefined };
  }

  return {};
}

// ============================================
// Helpers para Edge Functions
// ============================================

/**
 * Llama a la Edge Function de chat
 * Retorna la Response raw para permitir streaming
 */
export async function callChatFunction(
  request: ChatRequest,
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Usuario no autenticado. Inicia sesion para continuar.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.error || errorData.message || `Error ${response.status}`;
    throw new Error(message);
  }

  return response;
}

/**
 * Procesa una respuesta de chat con streaming SSE
 * Uso: for await (const event of streamChatResponse(response)) { ... }
 */
export async function* streamChatResponse(
  response: Response,
): AsyncGenerator<SSEEvent> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No se pudo obtener el reader del stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEventType = "text";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const result = processSSELine(line, currentEventType);

        if (result.newEventType) {
          currentEventType = result.newEventType;
        } else if (result.event) {
          yield result.event;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Llama a la Edge Function de chat y retorna la respuesta completa (sin streaming)
 */
export async function fetchChatResponse(
  request: Omit<ChatRequest, "stream">,
): Promise<ChatResponse> {
  const response = await callChatFunction({ ...request, stream: false });
  return response.json();
}
