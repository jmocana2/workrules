/**
 * Fakes compartidas por los tests de `ChatPage` y `useChatPage`.
 *
 * Nota: los `vi.mock(...)` no se comparten desde este módulo porque Vitest los
 * hoista al top de cada archivo — la factory pasada a `vi.mock` no puede
 * referenciar variables importadas. Cada test declara sus `vi.mock` inline.
 */

import { vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { Repositories } from '@/providers/RepositoriesProvider';

export function createFakeRepositories(): Partial<Repositories> {
  return {
    convenio: {
      getById: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue([]),
      listOwnedByUser: vi.fn().mockResolvedValue([]),
      getPerfil: vi.fn().mockResolvedValue(null),
      getSignedPdfUrl: vi.fn().mockResolvedValue(null),
    },
    chatSession: {
      listByUser: vi.fn().mockResolvedValue([]),
      deleteById: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue('mock-session-id'),
      loadMessages: vi.fn().mockResolvedValue(null),
      getConvenioIdForSession: vi.fn().mockResolvedValue(null),
    },
    userPlan: {
      getPlan: vi.fn().mockResolvedValue('free'),
    },
    convenioUpload: {
      getUploadIdentity: vi.fn().mockResolvedValue(null),
      uploadPdf: vi.fn().mockResolvedValue({ signedUrl: '', filePath: '' }),
      confirmUpload: vi.fn().mockResolvedValue({
        status: 'started' as const,
        convenioId: 'mock',
        existingNombre: null,
      }),
      fetchProcessingStatus: vi.fn().mockResolvedValue({
        estado: 'procesando',
        errorMessage: null,
        progressStage: null,
        progressValue: null,
        progressMessage: null,
      }),
    },
  };
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}
