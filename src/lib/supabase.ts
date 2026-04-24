import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan variables de entorno de Supabase. " +
      "Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local",
  );
}

// Singleton para evitar multiples instancias
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
}

// Export directo para uso simple
export const supabase = getSupabaseClient();

// Re-export de tipos utiles
export type { AuthError, Session, User } from "@supabase/supabase-js";

/**
 * Crea una nueva sesión de chat en la base de datos
 *
 * @param userId - ID del usuario autenticado
 * @param convenioId - ID del convenio seleccionado
 * @param firstMessage - Primer mensaje del usuario (para generar el título)
 * @returns ID de la sesión creada o null si falla
 */
export async function createChatSession(
  userId: string,
  convenioId: string,
  firstMessage: string,
): Promise<string | null> {
  try {
    // Generar título automático desde el primer mensaje (máximo 200 caracteres)
    const title = firstMessage.length > 200
      ? firstMessage.substring(0, 197) + "..."
      : firstMessage;
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: userId,
        convenio_id: convenioId,
        title,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[supabase] Error creating chat session:", error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error("[supabase] Unexpected error creating chat session:", err);
    return null;
  }
}
