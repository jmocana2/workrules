import { useChat } from "@ai-sdk/react";
import { useChatStream } from "@ui/hooks/useChatStream";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatMessage, Citation } from "../ChatPage.types";
import { buildPdfHref, getMessageText } from "../helpers/messageAdapters";
import type { ProtocolSendMessage } from "./useProtocolState";

/**
 * URL base de Supabase para el transporte del `useChat` del AI SDK en modo
 * mock. Vacío en Storybook estático.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

/**
 * Regex para extraer citaciones markdown `[texto](url)` del último mensaje
 * del asistente en modo mock. Los cuantificadores acotados evitan
 * backtracking exponencial que dispararía `sonarjs/regex-complexity`.
 */
const MARKDOWN_CITATION_REGEX = /\[([^\]]{1,200})\]\(([^)\s]{1,500})\)/g;

export interface UseChatIntegrationOptions {
  mode: "real" | "mock";
  convenioId: string | null;
  sessionId: string | null;
  onSpecialState: (
    state: { type: string; payload: Record<string, unknown> },
  ) => void;
  onResolvedVariables: (resolved: Record<string, string>) => void;
  onError?: (err: Error) => void;
}

export interface UseChatIntegrationReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  citations: Citation[];
  sendMessage: ProtocolSendMessage;
  sendMessageWithSession: (
    text: string,
    sessionId: string | undefined,
    variables: Record<string, string | number> | undefined,
    replayLastUser: boolean,
    mode: "salary" | undefined,
  ) => Promise<void>;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
}

/**
 * Unifica el chat real (`useChatStream`) y el chat mock (`useChat` del AI
 * SDK) detrás de una única API. Instancia ambos hooks incondicionalmente
 * (React lo exige) pero sólo expone el activo según `mode`.
 *
 * Encapsula también:
 * - Transformación de mensajes al tipo local `ChatMessage`.
 * - Parseo de citaciones markdown del último mensaje del asistente
 *   (heurística exclusiva del modo mock).
 * - Construcción del `href` con `#page=N` para las citaciones reales.
 */
export function useChatIntegration(
  options: UseChatIntegrationOptions,
): UseChatIntegrationReturn {
  const {
    mode,
    convenioId,
    sessionId,
    onSpecialState,
    onResolvedVariables,
    onError,
  } = options;
  const shouldUseMocks = mode === "mock";

  const realChat = useChatStream({
    convenioId,
    sessionId: shouldUseMocks ? undefined : sessionId || undefined,
    onSpecialState,
    onError: (err) => {
      console.error("[useChatIntegration] Chat error:", err);
      onError?.(err);
    },
    onResolvedVariables,
  });

  const mockChat = useChat({
    transport: new DefaultChatTransport({
      api: SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/chat` : "/api/chat",
    }),
  });

  const [mockCitations, setMockCitations] = useState<Citation[]>([]);

  const mockMessages: ChatMessage[] = useMemo(
    () =>
      mockChat.messages.map((msg) => ({
        ...msg,
        content: getMessageText(msg),
        role: msg.role as "user" | "assistant" | "system",
      })),
    [mockChat.messages],
  );

  const realMessages: ChatMessage[] = useMemo(
    () =>
      realChat.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        citations: msg.citations?.map((c) => ({
          source: c.source,
          url: buildPdfHref(c.url_pdf, c.pagina) || c.url || "",
          text: c.section,
          url_pdf: c.url_pdf,
          pagina: c.pagina,
        })),
        parts: [{ type: "text" as const, text: msg.content }],
      })),
    [realChat.messages],
  );

  const messages = shouldUseMocks ? mockMessages : realMessages;
  const isLoading = shouldUseMocks
    ? mockChat.status === "streaming" || mockChat.status === "submitted"
    : realChat.isLoading;
  const error = shouldUseMocks ? mockChat.error ?? null : realChat.error;
  const citations: Citation[] = shouldUseMocks
    ? mockCitations
    : realChat.citations.map((c) => ({
      source: c.source,
      url: buildPdfHref(c.url_pdf, c.pagina) || c.url || "",
      text: c.section,
      url_pdf: c.url_pdf,
      pagina: c.pagina,
    }));

  useEffect(() => {
    if (!shouldUseMocks) return;
    if (mockChat.status !== "ready" || mockMessages.length === 0) return;

    const lastMessage = mockMessages[mockMessages.length - 1];
    if (lastMessage.role !== "assistant") return;

    const parsedCitations: Citation[] = [];
    for (const match of lastMessage.content.matchAll(MARKDOWN_CITATION_REGEX)) {
      parsedCitations.push({ source: match[1], url: match[2] });
    }
    if (parsedCitations.length > 0) {
      setMockCitations(parsedCitations);
    }
  }, [shouldUseMocks, mockChat.status, mockMessages]);

  const sendMessage = useCallback<ProtocolSendMessage>(
    async (text, opts) => {
      if (shouldUseMocks) {
        await mockChat.sendMessage({ text });
      } else {
        await realChat.sendMessage(
          text,
          undefined,
          opts?.variables,
          opts?.replayLastUser,
        );
      }
    },
    [shouldUseMocks, mockChat, realChat],
  );

  const sendMessageWithSession = useCallback(
    async (
      text: string,
      overrideSessionId: string | undefined,
      variables: Record<string, string | number> | undefined,
      replayLastUser: boolean,
      salaryMode: "salary" | undefined,
    ) => {
      if (shouldUseMocks) {
        await mockChat.sendMessage({ text });
      } else {
        await realChat.sendMessage(
          text,
          overrideSessionId,
          variables,
          replayLastUser,
          salaryMode,
        );
      }
    },
    [shouldUseMocks, mockChat, realChat],
  );

  const setMessages = useCallback(
    (msgs: ChatMessage[]) => {
      if (shouldUseMocks) {
        mockChat.setMessages(msgs);
      } else {
        realChat.setMessages(
          msgs.map((m) => ({
            id: m.id,
            role: m.role === "system" ? "assistant" : m.role,
            content: m.content,
            createdAt: (m as { createdAt?: Date }).createdAt ?? new Date(),
            citations: m.citations?.map((c) => ({
              source: c.source,
              url: c.url,
              section: c.text,
              url_pdf: c.url_pdf,
              pagina: c.pagina,
            })),
          })),
        );
      }
    },
    [shouldUseMocks, mockChat, realChat],
  );

  const clearMessages = useCallback(() => {
    if (shouldUseMocks) {
      mockChat.setMessages([]);
      setMockCitations([]);
    } else {
      realChat.clearMessages();
    }
  }, [shouldUseMocks, mockChat, realChat]);

  return {
    messages,
    isLoading,
    error,
    citations,
    sendMessage,
    sendMessageWithSession,
    setMessages,
    clearMessages,
  };
}
