/**
 * Compatibility shim para codigo que aun importa `@/lib/supabase`.
 *
 * El cliente "canonico" vive en `@/infrastructure/clients/supabaseClient`.
 * Solo `@/infrastructure/repositories/*` y el shim de auth (`useSupabase`,
 * `chat-api.ts`) deberian acceder al cliente directamente.
 *
 * El resto de la aplicacion debe consumir casos de uso via
 * `useRepositories()` (Clean Architecture: ports & adapters).
 */
import { getSupabaseClient as getClient } from "@/infrastructure/clients/supabaseClient";

export const supabase = getClient();

export function getSupabaseClient() {
  return getClient();
}

export type { AuthError, Session, User } from "@supabase/supabase-js";
