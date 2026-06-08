import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Convenio } from '@core/types';
import type { IConvenioRepository } from '@/application/ports';
import { useConvenios } from './useConvenios';
import { createTestWrapper } from './testUtils';

vi.mock('./useSupabase', () => ({
  useSupabase: () => ({ user: null, session: null, loading: false }),
}));

function makeConvenio(partial: Partial<Convenio> = {}): Convenio {
  return {
    id: '1',
    nombre: 'Hostelería Madrid',
    nombre_oficial: null,
    nombre_corto: null,
    ambito: 'provincial',
    ambito_territorial: null,
    codigo_regcon: 'REG001',
    fecha_vigencia: '2024-01-01',
    url_pdf: '',
    estado: 'activo',
    visibilidad: 'publico',
    owner_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...partial,
  };
}

function makeConvenioRepo(
  overrides: Partial<IConvenioRepository> = {},
): IConvenioRepository {
  return {
    getById: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    listOwnedByUser: vi.fn().mockResolvedValue([]),
    getPerfil: vi.fn().mockResolvedValue(null),
    getSignedPdfUrl: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('useConvenios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches convenios via the repository', async () => {
    const repo = makeConvenioRepo({
      list: vi.fn().mockResolvedValue([makeConvenio()]),
    });

    const { result } = renderHook(() => useConvenios(), {
      wrapper: createTestWrapper({ convenio: repo }),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].nombre).toBe('Hostelería Madrid');
    expect(repo.list).toHaveBeenCalledWith({
      searchTerm: undefined,
      authenticatedUserId: null,
    });
  });

  it('passes searchTerm to the repository', async () => {
    const repo = makeConvenioRepo({
      list: vi.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() => useConvenios('madrid'), {
      wrapper: createTestWrapper({ convenio: repo }),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(repo.list).toHaveBeenCalledWith({
      searchTerm: 'madrid',
      authenticatedUserId: null,
    });
  });

  it('returns empty array when repository returns no data', async () => {
    const repo = makeConvenioRepo({
      list: vi.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() => useConvenios(), {
      wrapper: createTestWrapper({ convenio: repo }),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('throws error when repository fails', async () => {
    const repo = makeConvenioRepo({
      list: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const { result } = renderHook(() => useConvenios(), {
      wrapper: createTestWrapper({ convenio: repo }),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
