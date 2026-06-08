import { useQuery } from "@tanstack/react-query";
import { useRepositories } from "@/providers/RepositoriesProvider";
import { getUserPlan } from "@/application/use-cases";
import { useSupabase } from "./useSupabase";

export type UserPlan = "free" | "premium" | "enterprise";

/**
 * Devuelve el subscription_tier del usuario autenticado.
 * Mientras carga o si no hay usuario, devuelve 'free' (UI conservadora).
 */
export function useUserPlan() {
  const { userPlan } = useRepositories();
  const { user } = useSupabase();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["user-plan", userId],
    queryFn: (): Promise<UserPlan> => getUserPlan(userId, { repo: userPlan }),
    staleTime: 60 * 1000,
    enabled: userId !== null,
  });

  return {
    plan: query.data ?? "free",
    isLoading: query.isLoading,
    isPremium: query.data === "premium" || query.data === "enterprise",
  };
}
