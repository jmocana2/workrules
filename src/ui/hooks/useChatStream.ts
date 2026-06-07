/**
 * useChatStream - Hook para chat con streaming SSE
 *
 * Proporciona una API similar a useChat de Vercel AI SDK pero
 * adaptada al formato de eventos SSE del backend WorkRules.
 *
 * Features:
 * - Streaming word-by-word
 * - Deteccion de estados especiales (incomplete, invalid, smi_alert, conflicting)
 * - Parseo automatico de citaciones
 * - Manejo de errores con tipos especificos
 */

import {
  ChatApiError,
  type ChatHistoryMessage,
  type SSECitationEvent,
  type SSEStatusEvent,
  streamChat,
} from "@/lib/chat-api";
import { useCallback, useRef, useState } from "react";

// ============================================================================
// Tipos
// ============================================================================

export interface ChatStreamMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{
    source: string;
    url?: string;
    section?: string;
    url_pdf?: string | null;
    pagina?: number | null;
  }>;
  createdAt: Date;
}

export type SpecialStateType =
  | "incomplete"
  | "invalid"
  | "smi_alert"
  | "conflicting";

export interface SpecialState {
  type: SpecialStateType;
  payload: Record<string, unknown>;
}

export interface UseChatStreamOptions {
  /** ID del convenio seleccionado */
  convenioId: string | null;
  /** ID de sesion opcional */
  sessionId?: string;
  /** Mensajes iniciales */
  initialMessages?: ChatStreamMessage[];
  /** Callback cuando se recibe un estado especial */
  onSpecialState?: (state: SpecialState) => void;
  /** Callback cuando se completa el mensaje */
  onFinish?: (message: ChatStreamMessage) => void;
  /** Callback en caso de error */
  onError?: (error: Error) => void;
}

export interface UseChatStreamReturn {
  /** Lista de mensajes */
  messages: ChatStreamMessage[];
  /** Texto del input controlado */
  input: string;
  /** Si esta en proceso de streaming */
  isLoading: boolean;
  /** Error actual si lo hay */
  error: Error | null;
  /** Estado especial detectado (incomplete, invalid, etc.) */
  specialState: SpecialState | null;
  /** Citaciones del ultimo mensaje */
  citations: Array<{
    source: string;
    url?: string;
    section?: string;
    url_pdf?: string | null;
    pagina?: number | null;
  }>;
  /** Cambiar el input */
  setInput: (value: string) => void;
  /** Enviar mensaje */
  sendMessage: (
    text: string,
    overrideSessionId?: string,
    variables?: Record<string, string | number>,
    replayLastUser?: boolean,
    mode?: "salary",
  ) => Promise<void>;
  /** Establecer mensajes (util para cargar historial) */
  setMessages: (messages: ChatStreamMessage[]) => void;
  /** Limpiar estado especial */
  clearSpecialState: () => void;
  /** Limpiar mensajes */
  clearMessages: () => void;
  /** Cancelar streaming actual */
  cancel: () => void;
}

// ============================================================================
// Utilidades
// ============================================================================

let messageIdCounter = 0;

function generateId(): string {
  return `msg-${Date.now()}-${++messageIdCounter}`;
}

// ============================================================================
// Hook
// ============================================================================

export function useChatStream(
  options: UseChatStreamOptions,
): UseChatStreamReturn {
  const {
    convenioId,
    sessionId,
    initialMessages = [],
    onSpecialState,
    onFinish,
    onError,
  } = options;

  // Estado
  const [messages, setMessages] = useState<ChatStreamMessage[]>(
    initialMessages,
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [specialState, setSpecialState] = useState<SpecialState | null>(null);
  const [citations, setCitations] = useState<UseChatStreamReturn["citations"]>(
    [],
  );

  // Refs para cancelacion
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageRef = useRef<ChatStreamMessage | null>(null);

  // Ref para sessionId actualizado (para evitar problemas de closure)
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  /**
   * Envia un mensaje al chat
   * @param text - Texto del mensaje
   * @param overrideSessionId - SessionId opcional que sobrescribe el del estado (útil para el primer mensaje)
   */
  const sendMessage = useCallback(
    async (
      text: string,
      overrideSessionId?: string,
      variables?: Record<string, string | number>,
      replayLastUser?: boolean,
      mode?: "salary",
    ) => {
      const trimmedText = text.trim();

      if (!trimmedText) {
        return;
      }

      if (!convenioId) {
        const err = new Error(
          "Debes seleccionar un convenio antes de enviar un mensaje",
        );
        setError(err);
        onError?.(err);
        return;
      }

      // Usar overrideSessionId si se proporciona, sino usar el del ref
      const effectiveSessionId = overrideSessionId ?? sessionIdRef.current;

      // Cancelar request anterior si existe
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      // Limpiar estado
      setError(null);
      setSpecialState(null);
      setCitations([]);
      setIsLoading(true);

      // Agregar mensaje del usuario (omitido cuando se reenvía la última
      // pregunta tras un DataRequestCard, para no duplicarla visualmente)
      if (!replayLastUser) {
        const userMessage: ChatStreamMessage = {
          id: generateId(),
          role: "user",
          content: trimmedText,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
      }

      // Crear mensaje del asistente (vacio inicialmente)
      const assistantMessage: ChatStreamMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
        citations: [],
        createdAt: new Date(),
      };

      currentMessageRef.current = assistantMessage;

      // Construir historial de mensajes anteriores para contexto multi-turno
      // Usamos el estado actual de messages (antes de añadir el nuevo mensaje del usuario)
      // Limitamos a los últimos 10 mensajes para no sobrecargar el contexto
      const historyMessages: ChatHistoryMessage[] = messages
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      setMessages((prev) => [...prev, assistantMessage]);

      // Acumular citaciones durante el streaming
      const streamCitations: UseChatStreamReturn["citations"] = [];

      try {
        await streamChat(
          {
            convenioId,
            pregunta: trimmedText,
            sessionId: effectiveSessionId,
            variables,
            stream: true,
            signal: abortControllerRef.current.signal,
            messages: historyMessages,
            mode,
          },
          {
            onText: (chunk) => {
              if (currentMessageRef.current) {
                currentMessageRef.current.content += chunk;
                // Actualizar estado inmediatamente para streaming visual
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (
                    lastIndex >= 0 && updated[lastIndex].role === "assistant"
                  ) {
                    updated[lastIndex] = { ...currentMessageRef.current! };
                  }
                  return updated;
                });
              }
            },

            onCitation: (citation: SSECitationEvent) => {
              const newCitation = {
                source: citation.articulo || citation.seccion || "Convenio",
                url: citation.url,
                section: citation.seccion,
                url_pdf: citation.url_pdf,
                pagina: citation.pagina,
              };
              streamCitations.push(newCitation);

              if (currentMessageRef.current) {
                currentMessageRef.current.citations = [...streamCitations];
              }
            },

            onStatus: (status: SSEStatusEvent) => {
              const state: SpecialState = {
                type: status.state,
                payload: status.payload,
              };
              setSpecialState(state);
              onSpecialState?.(state);
            },

            onDone: () => {
              if (currentMessageRef.current) {
                // Capturar el mensaje final ANTES de cualquier cambio de estado
                // Esto evita race condition con el finally block que hace currentMessageRef.current = null
                const finalMessage: ChatStreamMessage = {
                  ...currentMessageRef.current,
                  citations: [...streamCitations],
                };

                // Actualizar citaciones
                setCitations(streamCitations);

                // Actualizar mensaje final con copia del objeto
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (
                    lastIndex >= 0 && updated[lastIndex].role === "assistant"
                  ) {
                    updated[lastIndex] = finalMessage;
                  }
                  return updated;
                });

                onFinish?.(finalMessage);
              }
            },

            onError: (err) => {
              setError(err);
              onError?.(err);
            },
          },
        );
      } catch (err) {
        // Ignorar errores de cancelacion
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        const error = err instanceof Error
          ? err
          : new Error("Error desconocido");
        setError(error);
        onError?.(error);

        // Si es error de auth, mostrar mensaje especial
        if (err instanceof ChatApiError && err.isAuthError) {
          if (currentMessageRef.current) {
            currentMessageRef.current.content =
              "Por favor, inicia sesion para continuar.";
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
                updated[lastIndex] = { ...currentMessageRef.current! };
              }
              return updated;
            });
          }
        }
      } finally {
        setIsLoading(false);
        currentMessageRef.current = null;
      }
    },
    [convenioId, messages, onSpecialState, onFinish, onError],
  );

  /**
   * Establece mensajes (util para cargar historial)
   */
  const setMessagesCallback = useCallback(
    (newMessages: ChatStreamMessage[]) => {
      setMessages(newMessages);
      // Extraer citaciones del ultimo mensaje de asistente
      const lastAssistantMessage = newMessages
        .filter((m) => m.role === "assistant")
        .pop();
      if (lastAssistantMessage?.citations) {
        setCitations(lastAssistantMessage.citations);
      }
    },
    [],
  );

  /**
   * Limpia el estado especial
   */
  const clearSpecialState = useCallback(() => {
    setSpecialState(null);
  }, []);

  /**
   * Limpia todos los mensajes
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setCitations([]);
    setSpecialState(null);
    setError(null);
  }, []);

  /**
   * Cancela el streaming actual
   */
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    messages,
    input,
    isLoading,
    error,
    specialState,
    citations,
    setInput,
    sendMessage,
    setMessages: setMessagesCallback,
    clearSpecialState,
    clearMessages,
    cancel,
  };
}
