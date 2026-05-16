import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "./useSupabase";

export type UserPlan = "free" | "premium" | "enterprise";

/**
 * Devuelve el subscription_tier del usuario autenticado leyendo user_profiles.
 * Mientras carga o si no hay usuario, devuelve 'free' para que la UI sea
 * conservadora por defecto (sin pintar uploader ni botones premium).
 */
export function useUserPlan() {
  const { user } = useSupabase();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["user-plan", userId],
    queryFn: async (): Promise<UserPlan> => {
      if (!userId) return "free";

      const { data, error } = await supabase
        .from("user_profiles")
        .select("subscription_tier")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      const tier = data?.subscription_tier as UserPlan | undefined;
      return tier ?? "free";
    },
    staleTime: 60 * 1000,
    enabled: userId !== null,
  });

  return {
    plan: query.data ?? "free",
    isLoading: query.isLoading,
    isPremium: query.data === "premium" || query.data === "enterprise",
  };
}
