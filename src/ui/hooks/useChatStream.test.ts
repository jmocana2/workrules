/**
 * Tests para useChatStream hook
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStream } from './useChatStream';

// Mock del modulo chat-api
vi.mock('@/lib/chat-api', () => ({
  streamChat: vi.fn(),
  ChatApiError: class ChatApiError extends Error {
    constructor(
      message: string,
      public status: number,
      public body?: unknown
    ) {
      super(message);
      this.name = 'ChatApiError';
    }
    get isAuthError() {
      return this.status === 401;
    }
  },
}));

// Import despues del mock
import { streamChat } from '@/lib/chat-api';

const mockStreamChat = vi.mocked(streamChat);

describe('useChatStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('estado inicial', () => {
    it('inicializa con valores por defecto', () => {
      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio' })
      );

      expect(result.current.messages).toEqual([]);
      expect(result.current.input).toBe('');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.specialState).toBeNull();
      expect(result.current.citations).toEqual([]);
    });

    it('acepta mensajes iniciales', () => {
      const initialMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Hola',
          createdAt: new Date(),
        },
      ];

      const { result } = renderHook(() =>
        useChatStream({
          convenioId: 'test-convenio',
          initialMessages,
        })
      );

      expect(result.current.messages).toEqual(initialMessages);
    });
  });

  describe('setInput', () => {
    it('actualiza el input', () => {
      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio' })
      );

      act(() => {
        result.current.setInput('Hola mundo');
      });

      expect(result.current.input).toBe('Hola mundo');
    });
  });

  describe('sendMessage', () => {
    it('no envia mensaje vacio', async () => {
      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio' })
      );

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(mockStreamChat).not.toHaveBeenCalled();
      expect(result.current.messages).toEqual([]);
    });

    it('requiere convenioId', async () => {
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useChatStream({ convenioId: null, onError })
      );

      await act(async () => {
        await result.current.sendMessage('Hola');
      });

      expect(mockStreamChat).not.toHaveBeenCalled();
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('convenio');
      expect(onError).toHaveBeenCalled();
    });

    it('agrega mensaje del usuario y llama a streamChat', async () => {
      const onFinish = vi.fn();

      mockStreamChat.mockImplementation(async (_options, callbacks) => {
        // Simular streaming async real
        await new Promise(r => setTimeout(r, 0));
        callbacks?.onText?.('Respuesta ');
        await new Promise(r => setTimeout(r, 0));
        callbacks?.onText?.('del asistente');
        await new Promise(r => setTimeout(r, 0));
        callbacks?.onDone?.();
      });

      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio', onFinish })
      );

      await act(async () => {
        await result.current.sendMessage('Hola');
      });

      // Verificar que streamChat fue llamado con los parametros correctos
      expect(mockStreamChat).toHaveBeenCalledWith(
        expect.objectContaining({
          convenioId: 'test-convenio',
          pregunta: 'Hola',
          stream: true,
        }),
        expect.any(Object)
      );

      // Verificar que onFinish fue llamado
      expect(onFinish).toHaveBeenCalled();

      // Al menos el mensaje del usuario debe estar
      expect(result.current.messages.length).toBeGreaterThanOrEqual(1);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Hola');
    });

    it('acumula citaciones durante streaming', async () => {
      mockStreamChat.mockImplementation(async (_options, callbacks) => {
        callbacks?.onText?.('Segun el articulo...');
        callbacks?.onCitation?.({
          type: 'citation',
          articulo: 'Art. 24',
          seccion: 'Jornada',
          url: 'https://boe.es/xxx',
        });
        callbacks?.onDone?.();
      });

      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio' })
      );

      await act(async () => {
        await result.current.sendMessage('Pregunta');
      });

      expect(result.current.citations).toHaveLength(1);
      expect(result.current.citations[0]).toEqual({
        source: 'Art. 24',
        section: 'Jornada',
        url: 'https://boe.es/xxx',
      });
    });

    it('detecta estado especial (incomplete)', async () => {
      const onSpecialState = vi.fn();

      mockStreamChat.mockImplementation(async (_options, callbacks) => {
        callbacks?.onText?.('Necesito mas datos...');
        callbacks?.onStatus?.({
          type: 'status',
          state: 'incomplete',
          payload: { missingVariables: ['categoria'] },
        });
        callbacks?.onDone?.();
      });

      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio', onSpecialState })
      );

      await act(async () => {
        await result.current.sendMessage('Calcula mi salario');
      });

      expect(result.current.specialState).toEqual({
        type: 'incomplete',
        payload: { missingVariables: ['categoria'] },
      });
      expect(onSpecialState).toHaveBeenCalledWith({
        type: 'incomplete',
        payload: { missingVariables: ['categoria'] },
      });
    });

    it('detecta estado smi_alert', async () => {
      mockStreamChat.mockImplementation(async (_options, callbacks) => {
        callbacks?.onStatus?.({
          type: 'status',
          state: 'smi_alert',
          payload: {
            calculatedAmount: 800,
            smiAmount: 1134,
            adjustedAmount: 1134,
          },
        });
        callbacks?.onDone?.();
      });

      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio' })
      );

      await act(async () => {
        await result.current.sendMessage('Salario de aprendiz');
      });

      expect(result.current.specialState?.type).toBe('smi_alert');
    });

    it('llama onFinish al completar', async () => {
      const onFinish = vi.fn();

      mockStreamChat.mockImplementation(async (_options, callbacks) => {
        callbacks?.onText?.('Respuesta completa');
        callbacks?.onDone?.();
      });

      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio', onFinish })
      );

      await act(async () => {
        await result.current.sendMessage('Pregunta');
      });

      expect(onFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: 'Respuesta completa',
        })
      );
    });

    it('maneja errores del streaming', async () => {
      const onError = vi.fn();
      const testError = new Error('Error de red');

      mockStreamChat.mockImplementation(async (_options, callbacks) => {
        callbacks?.onError?.(testError);
        throw testError;
      });

      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio', onError })
      );

      await act(async () => {
        await result.current.sendMessage('Pregunta');
      });

      expect(result.current.error).toBe(testError);
      expect(onError).toHaveBeenCalledWith(testError);
    });

    it('muestra estado loading durante streaming', async () => {
      let resolveStream: () => void;
      const streamPromise = new Promise<void>((resolve) => {
        resolveStream = resolve;
      });

      mockStreamChat.mockImplementation(async () => {
        await streamPromise;
      });

      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio' })
      );

      // Iniciar envio sin await
      act(() => {
        result.current.sendMessage('Pregunta');
      });

      // Deberia estar loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolver y esperar
      await act(async () => {
        resolveStream!();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('clearSpecialState', () => {
    it('limpia el estado especial', async () => {
      mockStreamChat.mockImplementation(async (_options, callbacks) => {
        callbacks?.onStatus?.({
          type: 'status',
          state: 'incomplete',
          payload: {},
        });
        callbacks?.onDone?.();
      });

      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio' })
      );

      await act(async () => {
        await result.current.sendMessage('Mensaje');
      });

      expect(result.current.specialState).not.toBeNull();

      act(() => {
        result.current.clearSpecialState();
      });

      expect(result.current.specialState).toBeNull();
    });
  });

  describe('clearMessages', () => {
    it('limpia todos los mensajes y estado', async () => {
      mockStreamChat.mockImplementation(async (_options, callbacks) => {
        callbacks?.onText?.('Respuesta');
        callbacks?.onCitation?.({ type: 'citation', articulo: 'Art. 1' });
        callbacks?.onStatus?.({ type: 'status', state: 'incomplete', payload: {} });
        callbacks?.onDone?.();
      });

      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio' })
      );

      await act(async () => {
        await result.current.sendMessage('Mensaje');
      });

      expect(result.current.messages.length).toBeGreaterThan(0);
      expect(result.current.citations.length).toBeGreaterThan(0);
      expect(result.current.specialState).not.toBeNull();

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.citations).toEqual([]);
      expect(result.current.specialState).toBeNull();
    });
  });

  describe('cancel', () => {
    it('cancela el streaming y limpia loading', async () => {
      let streamResolve: () => void;
      const streamPromise = new Promise<void>((resolve) => {
        streamResolve = resolve;
      });

      mockStreamChat.mockImplementation(async () => {
        await streamPromise;
      });

      const { result } = renderHook(() =>
        useChatStream({ convenioId: 'test-convenio' })
      );

      // Iniciar envio
      act(() => {
        result.current.sendMessage('Pregunta');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Cancelar
      act(() => {
        result.current.cancel();
      });

      expect(result.current.isLoading).toBe(false);

      // Limpiar promesa pendiente
      streamResolve!();
    });
  });
});
