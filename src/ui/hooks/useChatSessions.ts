import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConversationSummary } from '@core/types';
import { useRepositories } from '@/providers/RepositoriesProvider';
import {
  deleteChatSession,
  listUserChatSessions,
} from '@/application/use-cases';

/**
 * Hook para obtener el historial de conversaciones del usuario.
 */
export function useChatSessions(userId: string | null) {
  const { chatSession } = useRepositories();

  return useQuery({
    queryKey: ['chatSessions', userId],
    queryFn: (): Promise<ConversationSummary[]> =>
      listUserChatSessions(userId, { repo: chatSession }),
    enabled: !!userId,
  });
}

/**
 * Hook para eliminar una conversacion.
 */
export function useDeleteChatSession() {
  const queryClient = useQueryClient();
  const { chatSession } = useRepositories();

  return useMutation({
    mutationFn: (sessionId: string) =>
      deleteChatSession(sessionId, { repo: chatSession }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
    },
  });
}
