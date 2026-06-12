import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const isE2ETesting = import.meta.env.VITE_E2E_TESTING === "true";

// En E2E toda la red va mockeada con page.route(), por lo que no necesitamos
// credenciales reales. Usamos valores placeholder para que la app arranque.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (isE2ETesting ? "https://e2e.supabase.co" : "");
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (isE2ETesting ? "e2e-anon-key" : "");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan variables de entorno de Supabase. " +
      "Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local",
  );
}

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

export const SUPABASE_URL = supabaseUrl;
