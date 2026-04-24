import { supabase } from '@/lib/supabase';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatSessions, useDeleteChatSession } from './useChatSessions';
import type { ReactNode } from 'react';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useChatSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches chat sessions successfully', async () => {
    const mockData = [
      {
        id: 'session-1',
        title: 'Consulta salario',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        convenio_id: 'conv-1',
        convenios: { nombre: 'Hostelería Madrid' },
      },
    ];

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { result } = renderHook(() => useChatSessions('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].title).toBe('Consulta salario');
    expect(result.current.data?.[0].convenioNombre).toBe('Hostelería Madrid');
  });

  it('returns empty array when userId is null', async () => {
    const { result } = renderHook(() => useChatSessions(null), {
      wrapper: createWrapper(),
    });

    // La query no debería ejecutarse y data está undefined hasta que la query corra
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('transforms data to ConversationSummary format', async () => {
    const mockData = [
      {
        id: 'session-1',
        title: null, // Test título por defecto
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        convenio_id: null,
        convenios: null,
      },
    ];

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { result } = renderHook(() => useChatSessions('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].title).toBe('Nueva conversación');
    expect(result.current.data?.[0].convenioNombre).toBe('Sin convenio');
  });

  it('throws error when query fails', async () => {
    const mockError = new Error('Database error');

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: mockError }),
    });

    const { result } = renderHook(() => useChatSessions('user-123'), {
      wrapper: createWrapper(),
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
    const mockDelete = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockReturnValue({
      delete: mockDelete,
      eq: mockEq,
    });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteChatSession(), { wrapper });

    await result.current.mutateAsync('session-1');

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'session-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['chatSessions'] });
  });

  it('throws error when deletion fails', async () => {
    const mockError = new Error('Delete failed');

    (supabase.from as any).mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: mockError }),
    });

    const { result } = renderHook(() => useDeleteChatSession(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync('session-1')).rejects.toThrow('Delete failed');
  });
});
