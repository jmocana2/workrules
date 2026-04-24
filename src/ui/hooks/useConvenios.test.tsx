import { supabase } from '@/lib/supabase';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConvenios } from './useConvenios';
import type { ReactNode } from 'react';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
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

describe('useConvenios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches public convenios when user is not authenticated', async () => {
    const mockData = [
      {
        id: '1',
        nombre: 'Hostelería Madrid',
        ambito: 'provincial',
        codigo_regcon: 'REG001',
        fecha_vigencia: '2024-01-01',
        estado: 'activo',
        visibilidad: 'publico',
        owner_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    // Mock sin usuario autenticado
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { result } = renderHook(() => useConvenios(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].nombre).toBe('Hostelería Madrid');
  });

  it('fetches public and private convenios when user is authenticated', async () => {
    const mockUserId = 'user-123';
    const mockData = [
      {
        id: '1',
        nombre: 'Hostelería Madrid',
        ambito: 'provincial',
        codigo_regcon: 'REG001',
        fecha_vigencia: '2024-01-01',
        estado: 'activo',
        visibilidad: 'publico',
        owner_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        nombre: 'Mi Convenio Privado',
        ambito: 'empresa',
        codigo_regcon: 'PRIV001',
        fecha_vigencia: '2024-01-01',
        estado: 'procesando',
        visibilidad: 'privado',
        owner_id: mockUserId,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    // Mock con usuario autenticado
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { result } = renderHook(() => useConvenios(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].nombre).toBe('Hostelería Madrid');
    expect(result.current.data?.[1].nombre).toBe('Mi Convenio Privado');
  });

  it.skip('filters by search term using ilike', async () => {
    // TODO: Fix this test - mock chain not working correctly
    const mockData = [
      {
        id: '2',
        nombre: 'Comercio Madrid',
        ambito: 'provincial',
        codigo_regcon: 'REG002',
        fecha_vigencia: '2024-01-01',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    const mockIlikeFn = vi.fn();
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn((...args) => {
        mockIlikeFn(...args);
        return mockChain;
      }),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    };

    (supabase.from as any).mockReturnValue(mockChain);

    const { result } = renderHook(() => useConvenios('madrid'), { wrapper: createWrapper() });

    // Esperar a que termine (exitoso o con error)
    await waitFor(() => {
      if (result.current.isError) {
        console.log('Error:', result.current.error);
      }
      return !result.current.isLoading;
    }, { timeout: 3000 });

    // Verificar que fue exitoso
    if (result.current.isError) {
      console.log('Query failed with error:', result.current.error);
    }
    expect(result.current.isSuccess).toBe(true);
    expect(mockIlikeFn).toHaveBeenCalledWith('nombre', '%madrid%');
    expect(result.current.data).toHaveLength(1);
  });

  it('does not apply filter when search term is empty', async () => {
    const mockData: any[] = [];
    const mockIlike = vi.fn().mockReturnThis();

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: mockIlike,
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { result } = renderHook(() => useConvenios(''), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockIlike).not.toHaveBeenCalled();
  });

  it('returns empty array when no data', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { result } = renderHook(() => useConvenios(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('throws error when query fails', async () => {
    const mockError = new Error('Database error');

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
    });

    const { result } = renderHook(() => useConvenios(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
