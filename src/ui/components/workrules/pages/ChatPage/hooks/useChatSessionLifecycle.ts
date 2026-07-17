import {
  createChatSession,
  getConvenioById,
  getConvenioIdForSession,
  loadChatSessionMessages,
} from "@/application/use-cases";
import type {
  IChatSessionRepository,
  IConvenioRepository,
} from "@/application/ports";
import { useCallback, useState } from "react";
import type { ChatMessage, Convenio } from "../ChatPage.types";

export interface UseChatSessionLifecycleOptions {
  userId: string | null;
  chatSessionRepo: IChatSessionRepository;
  convenioRepo: IConvenioRepository;
}

/**
 * Resultado de cargar una sesión histórica: los mensajes ya adaptados al
 * tipo local `ChatMessage` y el convenio asociado (`null` si el backend no
 * pudo resolverlo).
 */
export interface LoadedSession {
  messages: ChatMessage[];
  convenio: Convenio | null;
}

export interface UseChatSessionLifecycleReturn {
  sessionId: string | null;
  createSessionIfNeeded: (
    convenioId: string,
    firstMessage: string,
  ) => Promise<string | null>;
  loadSession: (id: string) => Promise<LoadedSession | null>;
  setActiveSession: (id: string) => void;
  resetSession: () => void;
}

/**
 * Gestiona el ciclo de vida de la sesión de chat: creación perezosa al
 * primer mensaje del usuario y carga de sesiones históricas desde el
 * repositorio. Encapsula los 3 use cases de `application/use-cases` sobre
 * `chatSession` + `convenio` para que el orquestador no los toque.
 *
 * No decide qué hacer con los mensajes cargados — devuelve el resultado y
 * es el consumidor quien lo pinta vía `useChatIntegration.setMessages`.
 */
export function useChatSessionLifecycle(
  options: UseChatSessionLifecycleOptions,
): UseChatSessionLifecycleReturn {
  const { userId, chatSessionRepo, convenioRepo } = options;

  const [sessionId, setSessionId] = useState<string | null>(null);

  const createSessionIfNeeded = useCallback(
    async (convenioId: string, firstMessage: string) => {
      if (sessionId) return sessionId;
      if (!userId || !convenioId) return null;

      const newSessionId = await createChatSession(
        { userId, convenioId, firstMessage },
        { repo: chatSessionRepo },
      );
      if (!newSessionId) {
        console.error(
          "[useChatSessionLifecycle] Failed to create chat session",
        );
        return null;
      }
      setSessionId(newSessionId);
      return newSessionId;
    },
    [sessionId, userId, chatSessionRepo],
  );

  const loadSession = useCallback(
    async (id: string): Promise<LoadedSession | null> => {
      try {
        const convenioIdForSession = await getConvenioIdForSession(id, {
          repo: chatSessionRepo,
        });
        if (!convenioIdForSession) {
          console.error("[useChatSessionLifecycle] Session not found:", id);
          return null;
        }

        const loadedMessages = await loadChatSessionMessages(id, {
          repo: chatSessionRepo,
        });
        if (!loadedMessages) {
          console.error(
            "[useChatSessionLifecycle] Failed to load chat messages",
          );
          return null;
        }

        const messages: ChatMessage[] = loadedMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          createdAt: msg.createdAt,
          citations: msg.citations?.map((c) => ({
            source: c.source,
            url: c.url ?? "",
            text: c.section,
            url_pdf: c.url_pdf,
            pagina: c.pagina,
          })) ?? [],
          parts: [{ type: "text" as const, text: msg.content }],
        }));

        const convenio = await getConvenioById(convenioIdForSession, {
          repo: convenioRepo,
        });

        return { messages, convenio: convenio ?? null };
      } catch (err) {
        console.error(
          "[useChatSessionLifecycle] Error loading conversation:",
          err,
        );
        return null;
      }
    },
    [chatSessionRepo, convenioRepo],
  );

  const setActiveSession = useCallback((id: string) => {
    setSessionId(id);
  }, []);

  const resetSession = useCallback(() => {
    setSessionId(null);
  }, []);

  return {
    sessionId,
    createSessionIfNeeded,
    loadSession,
    setActiveSession,
    resetSession,
  };
}
