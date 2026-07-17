/**
 * Contratos del use case CalculateSalary.
 * Cambia cuando cambia la API pública del use case (deps inyectables o forma
 * del resultado). Aislado del wiring y del flujo.
 */

import type { StreamOptions } from "../../../lib/anthropic.ts";
import type {
  CacheHit,
  ChunkSearchResult,
  Convenio,
  QuotaStatus,
} from "../../../lib/supabase.ts";
import type {
  AskQuestionCacheHit,
  AskQuestionError,
  AskQuestionNotFound,
  AskQuestionQuotaExceeded,
  AskQuestionStreamResult,
} from "../ask-question/types.ts";
import type {
  CalculateSalaryIncomplete,
  CalculateSalaryInvalid,
  CalculateSalarySuccess,
} from "../types.ts";

/**
 * Unión de todos los estados posibles devueltos por `calculateSalary`.
 * Reutiliza los estados genéricos de `ask-question` para cache/cuota/not-found/
 * error/stream y añade los específicos del cálculo salarial.
 */
export type CalculateSalaryResult =
  | CalculateSalarySuccess
  | CalculateSalaryIncomplete
  | CalculateSalaryInvalid
  | AskQuestionCacheHit
  | AskQuestionQuotaExceeded
  | AskQuestionNotFound
  | AskQuestionError
  | AskQuestionStreamResult;

/**
 * Dependencias inyectables del use case. Todo I/O externo pasa por aquí para
 * que los tests puedan sustituir cada capacidad sin tocar red ni DB.
 */
export interface CalculateSalaryDeps {
  checkUserQuota: (userId: string) => Promise<QuotaStatus>;
  embedQuestion: (text: string) => Promise<number[]>;
  searchSemanticCache: (
    embedding: number[],
    convenioId: string,
    threshold?: number,
  ) => Promise<CacheHit | null>;
  getConvenioById: (convenioId: string) => Promise<Convenio | null>;
  searchChunksByConvenio: (
    embedding: number[],
    convenioId: string,
    limit?: number,
    threshold?: number,
  ) => Promise<ChunkSearchResult[]>;
  getPerfilByConvenio: (
    convenioId: string,
  ) => Promise<Record<string, unknown> | null>;
  createChatResponse: (options: StreamOptions) => Promise<string>;
  streamChatResponse: (
    options: StreamOptions,
  ) => Promise<ReadableStream<Uint8Array>>;
  saveToSemanticCache: (
    embedding: number[],
    query: string,
    response: string,
    convenioId: string,
    citations?: Record<string, unknown>[],
  ) => Promise<void>;
  saveChatMessage: (
    sessionId: string,
    role: "user" | "assistant" | "system",
    content: string,
  ) => Promise<void>;
  incrementQueryCount: (userId: string) => Promise<boolean>;
}
