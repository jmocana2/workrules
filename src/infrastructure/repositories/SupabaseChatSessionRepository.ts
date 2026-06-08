import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationSummary } from "@core/types";
import type {
  ChatMessageRecord,
  IChatSessionRepository,
} from "@/application/ports";

type ConvenioJoin = {
  nombre?: string;
  nombre_oficial?: string | null;
  nombre_corto?: string | null;
  ambito_territorial?: string | null;
} | null;

/**
 * Adaptador Supabase para el historial de conversaciones del usuario.
 */
export class SupabaseChatSessionRepository implements IChatSessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listByUser(
    userId: string,
    limit = 50,
  ): Promise<ConversationSummary[]> {
    const { data, error } = await this.client
      .from("chat_sessions")
      .select(
        `
        id,
        title,
        created_at,
        updated_at,
        convenio_id,
        convenios(nombre, nombre_oficial, nombre_corto, ambito_territorial)
      `,
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((session) => {
      const c = (session.convenios as ConvenioJoin) ?? null;
      const corto = c?.nombre_corto?.trim();
      const oficial = c?.nombre_oficial?.trim();
      const territorial = c?.ambito_territorial?.trim();
      const base = corto ?? oficial;
      const convenioNombre =
        base && territorial
          ? `${base} — ${territorial}`
          : base ?? c?.nombre ?? "Sin convenio";

      return {
        id: session.id,
        title: session.title ?? "Nueva conversación",
        convenioId: session.convenio_id ?? "",
        convenioNombre,
        lastMessageAt: session.updated_at,
        preview: "",
      };
    });
  }

  async deleteById(sessionId: string): Promise<void> {
    const { error } = await this.client
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) throw error;
  }

  async create(input: {
    userId: string;
    convenioId: string;
    firstMessage: string;
  }): Promise<string | null> {
    try {
      const title =
        input.firstMessage.length > 200
          ? input.firstMessage.substring(0, 197) + "..."
          : input.firstMessage;
      const { data, error } = await this.client
        .from("chat_sessions")
        .insert({
          user_id: input.userId,
          convenio_id: input.convenioId,
          title,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[SupabaseChatSession] Error creating session:", error);
        return null;
      }
      return data?.id ?? null;
    } catch (err) {
      console.error(
        "[SupabaseChatSession] Unexpected error creating session:",
        err,
      );
      return null;
    }
  }

  async loadMessages(sessionId: string): Promise<ChatMessageRecord[] | null> {
    try {
      const { data, error } = await this.client
        .from("chat_messages")
        .select("id, role, content, metadata, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[SupabaseChatSession] Error loading messages:", error);
        return null;
      }

      return (data ?? []).map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        createdAt: new Date(msg.created_at),
        citations: msg.metadata?.citations ?? [],
      }));
    } catch (err) {
      console.error(
        "[SupabaseChatSession] Unexpected error loading messages:",
        err,
      );
      return null;
    }
  }

  async getConvenioIdForSession(sessionId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("chat_sessions")
      .select("convenio_id")
      .eq("id", sessionId)
      .single();

    if (error || !data) return null;
    return (data.convenio_id as string) ?? null;
  }
}
