import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Convenio } from '@core/types';

/**
 * Hook para obtener el detalle de un convenio específico
 * @param id - ID del convenio a consultar
 * @returns Query con el detalle del convenio
 */
export function useConvenio(id: string | null) {
  return useQuery({
    queryKey: ['convenio', id],
    queryFn: async (): Promise<Convenio | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('convenios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    },
    enabled: !!id,
  });
}
