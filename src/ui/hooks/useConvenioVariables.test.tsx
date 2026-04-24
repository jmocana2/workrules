import { supabase } from '@/lib/supabase';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConvenioVariables } from './useConvenioVariables';
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

describe('useConvenioVariables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and transforms perfil data successfully', async () => {
    const mockPerfilData = {
      convenio: 'Hostelería Madrid',
      variables_criticas: ['categoria profesional', 'tipo de establecimiento'],
      valores_posibles: {
        'categoria profesional': ['Grupo I', 'Grupo II'],
        'tipo de establecimiento': ['Bar', 'Restaurante'],
      },
      descripciones: {
        'categoria profesional': 'Categoría del puesto',
      },
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { perfil_data: mockPerfilData },
        error: null,
      }),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.convenio).toBe('Hostelería Madrid');
    expect(result.current.data?.variables_criticas).toHaveLength(2);
    expect(result.current.data?.valores_posibles['categoria profesional']).toContain('Grupo I');
  });

  it('returns null when convenioId is null', async () => {
    const { result } = renderHook(() => useConvenioVariables(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns null when profile is not found (PGRST116)', async () => {
    const notFoundError = { code: 'PGRST116', message: 'Not found' };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: notFoundError,
      }),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('builds valores_posibles from categorias_profesionales', async () => {
    const mockPerfilData = {
      convenio: 'Test',
      variables_criticas: ['categoria profesional'],
      categorias_profesionales: [
        { nombre: 'Grupo I' },
        { nombre: 'Grupo II' },
      ],
      descripciones: {},
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { perfil_data: mockPerfilData },
        error: null,
      }),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.valores_posibles['categoria profesional']).toEqual([
      'Grupo I',
      'Grupo II',
    ]);
  });

  it('builds valores_posibles from mapeo_establecimientos', async () => {
    const mockPerfilData = {
      convenio: 'Test',
      variables_criticas: ['tipo de establecimiento'],
      mapeo_establecimientos: {
        Bar: {},
        Restaurante: {},
      },
      descripciones: {},
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { perfil_data: mockPerfilData },
        error: null,
      }),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.valores_posibles['tipo de establecimiento']).toEqual([
      'Bar',
      'Restaurante',
    ]);
  });

  it('handles categorias_profesionales as simple strings', async () => {
    const mockPerfilData = {
      convenio: 'Test',
      variables_criticas: ['categoria profesional'],
      categorias_profesionales: ['Grupo I', 'Grupo II'],
      descripciones: {},
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { perfil_data: mockPerfilData },
        error: null,
      }),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.valores_posibles['categoria profesional']).toEqual([
      'Grupo I',
      'Grupo II',
    ]);
  });

  it('throws error when query fails with non-PGRST116 error', async () => {
    const mockError = new Error('Database error');

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });

  it('returns null when perfil_data is null', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { perfil_data: null },
        error: null,
      }),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('extracts área funcional from variables_especificas', async () => {
    const mockPerfilData = {
      convenio: 'Convenio TIC',
      variables_criticas: ['área funcional'],
      variables_especificas: {
        area_funcional: [
          'Área 1 - Gestión',
          'Área 2 - Administración',
          'Área 3 - Atención al usuario',
        ],
      },
      categorias_profesionales: [],
      descripciones: {},
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { perfil_data: mockPerfilData },
        error: null,
      }),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-tic'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.valores_posibles['área funcional']).toEqual([
      'Área 1 - Gestión',
      'Área 2 - Administración',
      'Área 3 - Atención al usuario',
    ]);
  });

  it('extracts grupos and niveles profesionales from categorias_profesionales', async () => {
    const mockPerfilData = {
      convenio: 'Convenio TIC',
      variables_criticas: ['grupo profesional', 'nivel profesional'],
      categorias_profesionales: [
        { grupo: 'A', nivel: '1', nombre: 'Grupo A' },
        { grupo: 'B', nivel: '1', nombre: 'Grupo B Nivel 1' },
        { grupo: 'B', nivel: '2', nombre: 'Grupo B Nivel 2' },
        { grupo: 'C', nivel: '1', nombre: 'Grupo C Nivel 1' },
        { grupo: 'Ad personam', nivel: 'TGS', nombre: 'Titulado de Grado Superior' },
      ],
      descripciones: {},
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { perfil_data: mockPerfilData },
        error: null,
      }),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-tic'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.valores_posibles['grupo profesional']).toEqual([
      'Grupo A',
      'Grupo B',
      'Grupo C',
    ]);
    expect(result.current.data?.valores_posibles['nivel profesional']).toEqual([
      'Nivel 1',
      'Nivel 2',
    ]);
  });

  it('generates default values for antigüedad, jornada, and trabajo a distancia', async () => {
    const mockPerfilData = {
      convenio: 'Test',
      variables_criticas: ['antigüedad en años', 'jornada (completa/parcial)', 'trabajo a distancia regular'],
      categorias_profesionales: [],
      descripciones: {},
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { perfil_data: mockPerfilData },
        error: null,
      }),
    });

    const { result } = renderHook(() => useConvenioVariables('conv-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.valores_posibles['antigüedad en años']).toHaveLength(41);
    expect(result.current.data?.valores_posibles['antigüedad en años']).toContain('0');
    expect(result.current.data?.valores_posibles['antigüedad en años']).toContain('40');
    expect(result.current.data?.valores_posibles['jornada (completa/parcial)']).toEqual([
      'completa',
      'parcial',
    ]);
    expect(result.current.data?.valores_posibles['trabajo a distancia regular']).toEqual([
      'sí',
      'no',
    ]);
  });

  it('extracts variables from Hostelería convenio with underscore naming', async () => {
    const mockPerfilData = {
      convenio: 'Hostelería Madrid',
      variables_criticas: [
        'categoria_profesional',
        'tipo_establecimiento',
        'jornada_laboral',
        'antiguedad_empresa',
        'edad_trabajador',
        'tipo_contrato',
        'horas_nocturnas',
        'dias_festivos_trabajados',
      ],
      variables_especificas: {
        nivel_retributivo: ['I', 'II-A', 'II-B', 'III', 'IV', 'V'],
        modalidad_contrato: ['indefinido', 'temporal', 'fijo_discontinuo'],
        tipo_establecimiento: ['A', 'B', 'C', 'D'],
      },
      mapeo_establecimientos: {
        'bar': 'C',
        'restaurante 5 tenedores': 'A',
        'cafetería 1 taza': 'C',
      },
      categorias_profesionales: [
        { nivel: 'I', nombre: 'Jefe/a de Cocina' },
        { nivel: 'III', nombre: 'Camarero/a' },
        { nivel: 'V', nombre: 'Auxiliar de Limpieza' },
      ],
      descripciones: {},
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { perfil_data: mockPerfilData },
        error: null,
      }),
    });

    const { result } = renderHook(() => useConvenioVariables('hosteleria-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verificar categorías profesionales
    expect(result.current.data?.valores_posibles['categoria_profesional']).toEqual([
      'Jefe/a de Cocina',
      'Camarero/a',
      'Auxiliar de Limpieza',
    ]);

    // Verificar tipo_establecimiento desde mapeo_establecimientos
    expect(result.current.data?.valores_posibles['tipo_establecimiento']).toContain('bar');
    expect(result.current.data?.valores_posibles['tipo_establecimiento']).toContain('restaurante 5 tenedores');

    // Verificar tipo_contrato desde variables_especificas
    expect(result.current.data?.valores_posibles['tipo_contrato']).toEqual([
      'indefinido',
      'temporal',
      'fijo_discontinuo',
    ]);

    // Verificar jornada_laboral
    expect(result.current.data?.valores_posibles['jornada_laboral']).toContain('completa');
    expect(result.current.data?.valores_posibles['jornada_laboral']).toContain('parcial');

    // Verificar antiguedad_empresa (0-40 años)
    expect(result.current.data?.valores_posibles['antiguedad_empresa']).toHaveLength(41);

    // Verificar edad_trabajador (16-70 años)
    expect(result.current.data?.valores_posibles['edad_trabajador']).toHaveLength(55);
    expect(result.current.data?.valores_posibles['edad_trabajador'][0]).toBe('16');

    // Verificar horas_nocturnas (0-12)
    expect(result.current.data?.valores_posibles['horas_nocturnas']).toHaveLength(13);

    // Verificar dias_festivos_trabajados (0-14)
    expect(result.current.data?.valores_posibles['dias_festivos_trabajados']).toHaveLength(15);
  });
});
