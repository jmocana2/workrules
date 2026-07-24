// supabase/functions/_shared/application/ports/chat-history-repository.ts

/** Repositorio del historial de mensajes de una sesión de chat. */
export interface ChatHistoryRepository {
  saveMessage(
    sessionId: string,
    role: "user" | "assistant" | "system",
    content: string,
  ): Promise<void>;
}
