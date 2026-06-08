import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IChatSessionRepository } from '@/application/ports';
import { useChatSessions, useDeleteChatSession } from './useChatSessions';
import {
  createTestWrapper,
  createTestWrapperWithClient,
} from './testUtils';

function makeChatSessionRepo(
  overrides: Partial<IChatSessionRepository> = {},
): IChatSessionRepository {
  return {
    listByUser: vi.fn().mockResolvedValue([]),
    deleteById: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(null),
    loadMessages: vi.fn().mockResolvedValue(null),
    getConvenioIdForSession: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('useChatSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches chat sessions successfully', async () => {
    const repo = makeChatSessionRepo({
      listByUser: vi.fn().mockResolvedValue([
        {
          id: 'session-1',
          title: 'Consulta salario',
          convenioId: 'conv-1',
          convenioNombre: 'Hostelería Madrid',
          lastMessageAt: '2024-01-02T00:00:00Z',
          preview: '',
        },
      ]),
    });

    const { result } = renderHook(() => useChatSessions('user-123'), {
      wrapper: createTestWrapper({ chatSession: repo }),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].title).toBe('Consulta salario');
    expect(result.current.data?.[0].convenioNombre).toBe('Hostelería Madrid');
    expect(repo.listByUser).toHaveBeenCalledWith('user-123');
  });

  it('returns empty array when userId is null', async () => {
    const repo = makeChatSessionRepo();

    const { result } = renderHook(() => useChatSessions(null), {
      wrapper: createTestWrapper({ chatSession: repo }),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe('idle');
    expect(repo.listByUser).not.toHaveBeenCalled();
  });

  it('throws error when repository fails', async () => {
    const repo = makeChatSessionRepo({
      listByUser: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const { result } = renderHook(() => useChatSessions('user-123'), {
      wrapper: createTestWrapper({ chatSession: repo }),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});

describe('useDeleteChatSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes session successfully and invalidates cache', async () => {
    const repo = makeChatSessionRepo({
      deleteById: vi.fn().mockResolvedValue(undefined),
    });
    const { Wrapper, queryClient } = createTestWrapperWithClient({
      chatSession: repo,
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteChatSession(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync('session-1');

    expect(repo.deleteById).toHaveBeenCalledWith('session-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['chatSessions'] });
  });

  it('throws error when deletion fails', async () => {
    const repo = makeChatSessionRepo({
      deleteById: vi.fn().mockRejectedValue(new Error('Delete failed')),
    });

    const { result } = renderHook(() => useDeleteChatSession(), {
      wrapper: createTestWrapper({ chatSession: repo }),
    });

    await expect(result.current.mutateAsync('session-1')).rejects.toThrow(
      'Delete failed',
    );
  });
});
