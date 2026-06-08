import { useQuery } from "@tanstack/react-query";
import type { Convenio } from "@core/types";
import { useRepositories } from "@/providers/RepositoriesProvider";
import { listConvenios } from "@/application/use-cases";
import { useSupabase } from "./useSupabase";

/**
 * Hook para obtener la lista de convenios disponibles para el usuario.
 * Incluye publicos activos + privados del usuario (filtrado por RLS).
 */
export function useConvenios(searchTerm?: string) {
  const { convenio } = useRepositories();
  const { user } = useSupabase();

  return useQuery({
    queryKey: ["convenios", searchTerm, user?.id ?? null],
    queryFn: (): Promise<Convenio[]> =>
      listConvenios(
        { searchTerm, authenticatedUserId: user?.id ?? null },
        { repo: convenio },
      ),
    staleTime: 5 * 60 * 1000,
  });
}
