import { useQuery } from "@tanstack/react-query";
import type { PerfilJson } from "@core/types";
import { useRepositories } from "@/providers/RepositoriesProvider";
import { getConvenioVariables } from "@/application/use-cases";

/**
 * Hook para obtener las variables criticas de un convenio (perfil JSON).
 */
export function useConvenioVariables(convenioId: string | null) {
  const { convenio } = useRepositories();

  return useQuery({
    queryKey: ["convenioVariables", convenioId],
    queryFn: (): Promise<PerfilJson | null> =>
      getConvenioVariables(convenioId, { repo: convenio }),
    enabled: !!convenioId,
  });
}
