import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PerfilJson } from '@core/types';
import type { IConvenioRepository } from '@/application/ports';
import { useConvenioVariables } from './useConvenioVariables';
import { createTestWrapper } from './testUtils';

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

describe('useConvenioVariables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns perfil from the repository', async () => {
    const perfil: PerfilJson = {
      convenio: 'Hostelería Madrid',
      variables_criticas: ['categoria profesional', 'tipo de establecimiento'],
      valores_posibles: {
        'categoria profesional': ['Grupo I', 'Grupo II'],
        'tipo de establecimiento': ['Bar', 'Restaurante'],
      },
      descripciones: { 'categoria profesional': 'Categoría del puesto' },
    };

    const repo = makeConvenioRepo({
      getPerfil: vi.fn().mockResolvedValue(perfil),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-1'), {
      wrapper: createTestWrapper({ convenio: repo }),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.convenio).toBe('Hostelería Madrid');
    expect(result.current.data?.variables_criticas).toHaveLength(2);
    expect(result.current.data?.valores_posibles['categoria profesional']).toContain(
      'Grupo I',
    );
    expect(repo.getPerfil).toHaveBeenCalledWith('conv-1');
  });

  it('returns null when convenioId is null', async () => {
    const repo = makeConvenioRepo();

    const { result } = renderHook(() => useConvenioVariables(null), {
      wrapper: createTestWrapper({ convenio: repo }),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe('idle');
    expect(repo.getPerfil).not.toHaveBeenCalled();
  });

  it('returns null when perfil is not found', async () => {
    const repo = makeConvenioRepo({
      getPerfil: vi.fn().mockResolvedValue(null),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-1'), {
      wrapper: createTestWrapper({ convenio: repo }),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('throws error when repository fails', async () => {
    const repo = makeConvenioRepo({
      getPerfil: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-1'), {
      wrapper: createTestWrapper({ convenio: repo }),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
