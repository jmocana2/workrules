/**
 * Tests para chat-api.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatApiError,
  getChatEndpoint,
  parseSSELine,
  type SSECitationEvent,
  type SSEDoneEvent,
  type SSEStatusEvent,
  type SSETextEvent,
} from './chat-api';

// Mock de supabase
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
      }),
    },
  },
}));

describe('chat-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseSSELine', () => {
    it('parsea evento de texto correctamente', () => {
      const line = 'data: {"type": "text", "content": "Hola mundo"}';
      const result = parseSSELine(line);

      expect(result).toEqual<SSETextEvent>({
        type: 'text',
        content: 'Hola mundo',
      });
    });

    it('parsea evento de citacion correctamente', () => {
      const line = 'data: {"type": "citation", "articulo": "Art. 24", "seccion": "Jornada"}';
      const result = parseSSELine(line);

      expect(result).toEqual<SSECitationEvent>({
        type: 'citation',
        articulo: 'Art. 24',
        seccion: 'Jornada',
      });
    });

    it('parsea evento de status correctamente', () => {
      const line = 'data: {"type": "status", "state": "incomplete", "payload": {"missingVariables": ["categoria"]}}';
      const result = parseSSELine(line);

      expect(result).toEqual<SSEStatusEvent>({
        type: 'status',
        state: 'incomplete',
        payload: { missingVariables: ['categoria'] },
      });
    });

    it('parsea evento done correctamente', () => {
      const line = 'data: {"type": "done", "metadata": {"response_length": 150}}';
      const result = parseSSELine(line);

      expect(result).toEqual<SSEDoneEvent>({
        type: 'done',
        metadata: { response_length: 150 },
      });
    });

    it('retorna null para lineas que no empiezan con data:', () => {
      expect(parseSSELine('event: message')).toBeNull();
      expect(parseSSELine('')).toBeNull();
      expect(parseSSELine('some random text')).toBeNull();
    });

    it('retorna null para [DONE]', () => {
      expect(parseSSELine('data: [DONE]')).toBeNull();
    });

    it('retorna null para JSON invalido', () => {
      expect(parseSSELine('data: {invalid json}')).toBeNull();
    });

    it('retorna null para data: vacio', () => {
      expect(parseSSELine('data: ')).toBeNull();
    });
  });

  describe('getChatEndpoint', () => {
    it('construye el endpoint correctamente', () => {
      // El mock de vite importa la variable de entorno
      const endpoint = getChatEndpoint();

      // Deberia terminar en /functions/v1/chat
      expect(endpoint).toMatch(/\/functions\/v1\/chat$/);
    });
  });

  describe('ChatApiError', () => {
    it('crea error con mensaje y status', () => {
      const error = new ChatApiError('Test error', 401);

      expect(error.message).toBe('Test error');
      expect(error.status).toBe(401);
      expect(error.name).toBe('ChatApiError');
    });

    it('detecta error de autenticacion', () => {
      const authError = new ChatApiError('Unauthorized', 401);
      const otherError = new ChatApiError('Not found', 404);

      expect(authError.isAuthError).toBe(true);
      expect(otherError.isAuthError).toBe(false);
    });

    it('detecta error de cuota', () => {
      const quotaError = new ChatApiError('Rate limit', 429);
      const otherError = new ChatApiError('Server error', 500);

      expect(quotaError.isQuotaError).toBe(true);
      expect(otherError.isQuotaError).toBe(false);
    });

    it('detecta error de not found', () => {
      const notFoundError = new ChatApiError('Convenio not found', 404);
      const otherError = new ChatApiError('Bad request', 400);

      expect(notFoundError.isNotFoundError).toBe(true);
      expect(otherError.isNotFoundError).toBe(false);
    });

    it('detecta error de validacion', () => {
      const validationError = new ChatApiError('Invalid data', 400);
      const otherError = new ChatApiError('Server error', 500);

      expect(validationError.isValidationError).toBe(true);
      expect(otherError.isValidationError).toBe(false);
    });

    it('almacena body del error', () => {
      const body = { error: 'Test', details: { field: 'valor' } };
      const error = new ChatApiError('Test', 400, body);

      expect(error.body).toEqual(body);
    });
  });
});
