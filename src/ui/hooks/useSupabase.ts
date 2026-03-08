import { supabase } from "@lib/supabase";
import { AuthError, Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

interface UseSupabaseReturn extends AuthState {
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
}

export function useSupabase(): UseSupabaseReturn {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });

  // Evita race condition: si el subscription ya actualizo el estado,
  // no dejamos que getSession() lo sobrescriba con datos potencialmente obsoletos
  const hasReceivedEvent = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Suscribirse a cambios de auth PRIMERO para no perder eventos
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        hasReceivedEvent.current = true;
        if (mounted) {
          setAuthState({
            session,
            user: session?.user ?? null,
            loading: false,
          });
        }
      },
    );

    // Obtener sesion inicial solo si no hemos recibido un evento del subscription
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (mounted && !hasReceivedEvent.current) {
          setAuthState({
            session,
            user: session?.user ?? null,
            loading: false,
          });
        }
      })
      .catch(() => {
        // Error de red u otro - salir del estado loading para no bloquear UI
        if (mounted && !hasReceivedEvent.current) {
          setAuthState({
            session: null,
            user: null,
            loading: false,
          });
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const fallbackOrigin =
      (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env
        ?.NEXT_PUBLIC_APP_URL ?? "";
    const origin = typeof window !== "undefined"
      ? window.location.origin
      : fallbackOrigin;
    const redirectTo = origin ? `${origin}/auth/callback` : "";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
    return { error };
  }, []);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  };
}
