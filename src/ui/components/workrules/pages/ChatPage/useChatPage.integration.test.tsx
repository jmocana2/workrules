/**
 * Tests de integracion para useChatPage
 *
 * Verifica el mapeo de estados del protocolo del backend a la UI:
 * - Estado A: Respuesta completa con citaciones
 * - Estado B: Datos incompletos -> DataRequestCard
 * - Estado D: Datos invalidos -> AlertInvalidData
 * - Estado E: Alerta SMI -> AlertSMI
 * - Estado F: Datos conflictivos -> AlertConflict
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatPage } from './useChatPage';

// Mock de los hooks externos
vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(() => ({
    messages: [],
    sendMessage: vi.fn(),
    status: 'ready',
    error: null,
    setMessages: vi.fn(),
  })),
}));

// Mock de useChatStream con control de estados
const mockSendMessage = vi.fn();
const mockClearMessages = vi.fn();
let mockOnSpecialState: ((state: { type: string; payload: Record<string, unknown> }) => void) | undefined;

vi.mock('@ui/hooks/useChatStream', () => ({
  useChatStream: vi.fn((options: { onSpecialState?: typeof mockOnSpecialState }) => {
    mockOnSpecialState = options.onSpecialState;
    return {
      messages: [],
      input: '',
      isLoading: false,
      error: null,
      specialState: null,
      citations: [],
      setInput: vi.fn(),
      sendMessage: mockSendMessage,
      clearSpecialState: vi.fn(),
      clearMessages: mockClearMessages,
      cancel: vi.fn(),
    };
  }),
}));

// Mock de supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
  },
  getSupabaseClient: vi.fn(),
  createChatSession: vi.fn().mockResolvedValue('mock-session-id'),
}));

// Mock de convenios
const MOCK_CONVENIO = {
  id: 'test-convenio-id',
  nombre: 'Convenio Test',
  ambito: 'estatal' as const,
  codigo_boe: 'BOE-A-2024-1234',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Helper para crear QueryClient
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

// Wrapper para renderHook con QueryClient
function renderHookWithQueryClient<TProps, TResult>(
  hook: (props: TProps) => TResult
) {
  const queryClient = createTestQueryClient();
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
  });
}

describe('useChatPage - Mapeo de Estados del Protocolo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSpecialState = undefined;
  });

  describe('Estado B - Datos incompletos', () => {
    it('muestra DataRequestCard cuando recibe estado incomplete', () => {
      const { result } = renderHookWithQueryClient(() =>
        useChatPage({
          mockConvenios: [MOCK_CONVENIO],
          useMocks: false,
        })
      );

      // Seleccionar convenio
      act(() => {
        result.current.selectConvenio(MOCK_CONVENIO);
      });

      // Simular evento de estado incomplete del backend
      act(() => {
        mockOnSpecialState?.({
          type: 'incomplete',
          payload: {
            missingVariables: ['categoria', 'antiguedad'],
            suggestions: {
              categoria: ['Camarero', 'Cocinero', 'Recepcionista'],
              antiguedad: ['0-1 año', '1-3 años', '3+ años'],
            },
          },
        });
      });

      // Verificar que DataRequestState se actualiza
      expect(result.current.dataRequestState.isVisible).toBe(true);
      expect(result.current.dataRequestState.payload).toBeDefined();
      expect(result.current.dataRequestState.payload?.title).toBe(
        'Necesito más información'
      );
      expect(result.current.dataRequestState.payload?.fields).toHaveLength(2);

      // Verificar que los campos tienen las opciones correctas
      const categoriaField = result.current.dataRequestState.payload?.fields.find(
        (f) => f.name === 'categoria'
      );
      expect(categoriaField?.options).toHaveLength(3);
      expect(categoriaField?.options?.[0].label).toBe('Camarero');
    });
  });

  describe('Estado D - Datos invalidos', () => {
    it('muestra AlertInvalidData cuando recibe estado invalid', () => {
      const { result } = renderHookWithQueryClient(() =>
        useChatPage({
          mockConvenios: [MOCK_CONVENIO],
          useMocks: false,
        })
      );

      // Seleccionar convenio
      act(() => {
        result.current.selectConvenio(MOCK_CONVENIO);
      });

      // Simular evento de estado invalid del backend
      act(() => {
        mockOnSpecialState?.({
          type: 'invalid',
          payload: {
            field: 'horas_extra',
            value: 200,
            limit: '80 horas/mes',
            legalReference: 'Art. 35.2 Estatuto de los Trabajadores',
            suggestions: ['40 horas', '60 horas', '80 horas'],
          },
        });
      });

      // Verificar que AlertState se actualiza
      expect(result.current.alertState.isVisible).toBe(true);
      expect(result.current.alertState.type).toBe('invalid_data');
      expect(result.current.alertState.payload).toBeDefined();
    });
  });

  describe('Estado E - Alerta SMI', () => {
    it('muestra AlertSMI cuando recibe estado smi_alert', () => {
      const { result } = renderHookWithQueryClient(() =>
        useChatPage({
          mockConvenios: [MOCK_CONVENIO],
          useMocks: false,
        })
      );

      // Seleccionar convenio
      act(() => {
        result.current.selectConvenio(MOCK_CONVENIO);
      });

      // Simular evento de estado smi_alert del backend
      act(() => {
        mockOnSpecialState?.({
          type: 'smi_alert',
          payload: {
            calculatedAmount: 800,
            smiAmount: 1134,
            adjustedAmount: 1134,
            payPeriod: '14-pagas',
            year: 2024,
          },
        });
      });

      // Verificar que AlertState se actualiza
      expect(result.current.alertState.isVisible).toBe(true);
      expect(result.current.alertState.type).toBe('smi');
      expect(result.current.alertState.payload).toBeDefined();
    });
  });

  describe('Estado F - Datos conflictivos', () => {
    it('muestra AlertConflict cuando recibe estado conflicting', () => {
      const { result } = renderHookWithQueryClient(() =>
        useChatPage({
          mockConvenios: [MOCK_CONVENIO],
          useMocks: false,
        })
      );

      // Seleccionar convenio
      act(() => {
        result.current.selectConvenio(MOCK_CONVENIO);
      });

      // Simular evento de estado conflicting del backend
      act(() => {
        mockOnSpecialState?.({
          type: 'conflicting',
          payload: {
            field1: { name: 'jornada', value: 'completa' },
            field2: { name: 'horas_semanales', value: '20' },
            explanation:
              'La jornada completa implica 40 horas semanales, pero indicaste 20 horas.',
            options: [
              { label: 'Jornada completa (40h)', value: 'full' },
              { label: 'Media jornada (20h)', value: 'part' },
            ],
          },
        });
      });

      // Verificar que AlertState se actualiza
      expect(result.current.alertState.isVisible).toBe(true);
      expect(result.current.alertState.type).toBe('conflict');
      expect(result.current.alertState.payload).toBeDefined();
    });
  });

  describe('Handlers de alertas', () => {
    it('handleAlertDismiss limpia el estado de alerta', () => {
      const { result } = renderHookWithQueryClient(() =>
        useChatPage({
          mockConvenios: [MOCK_CONVENIO],
          useMocks: false,
        })
      );

      // Seleccionar convenio y simular alerta
      act(() => {
        result.current.selectConvenio(MOCK_CONVENIO);
      });

      act(() => {
        mockOnSpecialState?.({
          type: 'smi_alert',
          payload: { calculatedAmount: 800, smiAmount: 1134 },
        });
      });

      expect(result.current.alertState.isVisible).toBe(true);

      // Descartar alerta
      act(() => {
        result.current.handleAlertDismiss();
      });

      expect(result.current.alertState.isVisible).toBe(false);
    });

    it('handleInvalidDataSuggestion actualiza el input y cierra la alerta', () => {
      const { result } = renderHookWithQueryClient(() =>
        useChatPage({
          mockConvenios: [MOCK_CONVENIO],
          useMocks: false,
        })
      );

      // Seleccionar convenio y simular alerta invalid
      act(() => {
        result.current.selectConvenio(MOCK_CONVENIO);
      });

      act(() => {
        mockOnSpecialState?.({
          type: 'invalid',
          payload: {
            field: 'horas',
            suggestions: ['40', '60'],
          },
        });
      });

      // Seleccionar sugerencia
      act(() => {
        result.current.handleInvalidDataSuggestion('40 horas semanales');
      });

      expect(result.current.input).toBe('40 horas semanales');
      expect(result.current.alertState.isVisible).toBe(false);
    });
  });
});
