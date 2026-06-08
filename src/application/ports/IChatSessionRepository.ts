import type { ConversationSummary } from "@core/types";

export interface ChatMessageCitation {
  source: string;
  url?: string;
  section?: string;
  url_pdf?: string | null;
  pagina?: number | null;
}

export interface ChatMessageRecord {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
  citations?: ChatMessageCitation[];
}

/**
 * Puerto para sesiones de chat (historial de conversaciones del usuario).
 */
export interface IChatSessionRepository {
  /** Conversaciones recientes del usuario (ordenadas por ultimo update). */
  listByUser(userId: string, limit?: number): Promise<ConversationSummary[]>;

  /** Borra una conversacion por id. */
  deleteById(sessionId: string): Promise<void>;

  /** Crea una nueva sesion y devuelve su id, o `null` si falla. */
  create(input: {
    userId: string;
    convenioId: string;
    firstMessage: string;
  }): Promise<string | null>;

  /** Carga los mensajes de una sesion ordenados cronologicamente. */
  loadMessages(sessionId: string): Promise<ChatMessageRecord[] | null>;

  /** Devuelve el convenio_id asociado a la sesion. */
  getConvenioIdForSession(sessionId: string): Promise<string | null>;
}
