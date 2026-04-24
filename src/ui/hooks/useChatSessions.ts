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
          convenios(nombre)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transformar a ConversationSummary
      return (data ?? []).map(session => ({
        id: session.id,
        title: session.title ?? 'Nueva conversación',
        convenioId: session.convenio_id ?? '',
        convenioNombre: (session.convenios as any)?.nombre ?? 'Sin convenio',
        lastMessageAt: session.updated_at,
        preview: '', // Se puede obtener del último mensaje si se necesita
      }));
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
