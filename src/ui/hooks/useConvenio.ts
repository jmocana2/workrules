import { useQuery } from '@tanstack/react-query';
import type { Convenio } from '@core/types';
import { useRepositories } from '@/providers/RepositoriesProvider';
import { getConvenioById } from '@/application/use-cases';

/**
 * Hook para obtener el detalle de un convenio especifico.
 * Consume el caso de uso `getConvenioById` inyectando el repositorio del provider.
 */
export function useConvenio(id: string | null) {
  const { convenio } = useRepositories();

  return useQuery({
    queryKey: ['convenio', id],
    queryFn: (): Promise<Convenio | null> =>
      getConvenioById(id, { repo: convenio }),
    enabled: !!id,
  });
}
