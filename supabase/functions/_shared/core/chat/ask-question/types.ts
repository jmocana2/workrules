/**
 * Contratos públicos del use case AskQuestion.
 */

import type { StreamOptions } from "../../../lib/anthropic.ts";
import type {
  CacheHit,
  ChunkSearchResult,
  Convenio,
  QuotaStatus,
} from "../../../lib/supabase.ts";
import type { ChatCitation, ChatHistoryMessage } from "../types.ts";

export interface AskQuestionInput {
  /** UUID del convenio a consultar */
  convenioId: string;
  /** Pregunta del usuario */
  pregunta: string;
  /** UUID del usuario */
  userId: string;
  /** UUID de sesion de chat (opcional) */
  sessionId?: string;
  /** Variables adicionales del usuario (categoria, jornada, etc) */
  variables?: Record<string, string>;
  /** Si true, retorna streaming SSE */
  stream?: boolean;
  /** Historial de mensajes anteriores para contexto multi-turno */
  messages?: ChatHistoryMessage[];
  /**
   * Perfil del convenio, pre-fetched por el router (refactor 007 fase 8b
   * etapa 2). Si viene, se usa; si es `undefined`, el use case hace fallback
   * a `deps.getPerfilByConvenio` para compatibilidad con callers directos.
   */
  perfil?: Record<string, unknown> | null;
}

export interface AskQuestionMetadata {
  cacheHit: boolean;
  chunksUsed: number;
  model: string;
  latencyMs: number;
}

/** Resultado exitoso con respuesta completa */
export interface AskQuestionSuccess {
  type: "success";
  response: string;
  metadata: AskQuestionMetadata;
  citations: ChatCitation[];
}

/** Resultado de cache hit */
export interface AskQuestionCacheHit {
  type: "cache_hit";
  response: string;
  metadata: AskQuestionMetadata;
  citations: ChatCitation[];
}

/** Usuario sin cuota */
export interface AskQuestionQuotaExceeded {
  type: "quota_exceeded";
  message: string;
}

/** Convenio no encontrado */
export interface AskQuestionNotFound {
  type: "not_found";
  message: string;
}

/** Error generico */
export interface AskQuestionError {
  type: "error";
  message: string;
  code: string;
}

/** Resultado de streaming */
export interface AskQuestionStreamResult {
  type: "stream";
  stream: ReadableStream<Uint8Array>;
  citations: ChatCitation[];
  /** Funcion a llamar al finalizar el stream para guardar en cache */
  cleanup: (fullResponse: string) => Promise<void>;
  /**
   * Variables resueltas en este turno, con claves crudas del perfil. Se emitiran
   * en el evento `done` del stream para que el front sincronice los chips.
   * Opcional: solo calculate-salary las rellena hoy.
   */
  resolvedVariables?: Record<string, string>;
}

export type AskQuestionResult =
  | AskQuestionSuccess
  | AskQuestionCacheHit
  | AskQuestionQuotaExceeded
  | AskQuestionNotFound
  | AskQuestionError
  | AskQuestionStreamResult;

/** Dependencias inyectables del use case (para testing y wiring). */
export interface AskQuestionDeps {
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
  getChunksByGroup: (
    convenioId: string,
    key: "articulo" | "seccion",
    value: string,
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
