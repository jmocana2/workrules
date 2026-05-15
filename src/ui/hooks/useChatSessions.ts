import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ConversationSummary } from '@core/types';

/**
 * Hook para obtener el historial de conversaciones del usuario
 * @param userId - ID del usuario actual
 * @returns Query con la lista de conversaciones
 */
export function useChatSessions(userId: string | null) {
  return useQuery({
    queryKey: ['chatSessions', userId],
    queryFn: async (): Promise<ConversationSummary[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          convenio_id,
          convenios(nombre, nombre_oficial, nombre_corto, ambito_territorial)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transformar a ConversationSummary
      return (data ?? []).map(session => {
        const c = (session.convenios as {
          nombre?: string;
          nombre_oficial?: string | null;
          nombre_corto?: string | null;
          ambito_territorial?: string | null;
        } | null) ?? null;
        const corto = c?.nombre_corto?.trim();
        const oficial = c?.nombre_oficial?.trim();
        const territorial = c?.ambito_territorial?.trim();
        const base = corto ?? oficial;
        const convenioNombre = base && territorial
          ? `${base} — ${territorial}`
          : base ?? c?.nombre ?? 'Sin convenio';

        return {
          id: session.id,
          title: session.title ?? 'Nueva conversación',
          convenioId: session.convenio_id ?? '',
          convenioNombre,
          lastMessageAt: session.updated_at,
          preview: '', // Se puede obtener del último mensaje si se necesita
        };
      });
    },
    enabled: !!userId,
  });
}

/**
 * Hook para eliminar una conversación
 * @returns Mutation para eliminar una conversación
 */
export function useDeleteChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar el cache de conversaciones para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
    },
  });
}
