/**
 * Contratos públicos del use case AskQuestion.
 */

import type {
  CacheHit,
  ConvenioSummary,
  LlmChatRequest,
  QuotaStatus,
  RetrievedChunk,
} from "../../ports/dtos.ts";
import type { ChatCitation } from "../types.ts";
import type { ChatCommand } from "../../../domain/chat-command/chat-command.ts";

/**
 * Input del use case AskQuestion (refactor 007 fase 8b etapa 3).
 * El DTO HTTP crudo ya no llega hasta aquí: el router valida y construye el
 * `ChatCommand`, opcionalmente aplica un override sobre la pregunta (ranges
 * transformer) e inyecta el `perfil` pre-fetched.
 */
export interface AskQuestionInput {
  /** Comando validado por `toChatCommand` en el router. */
  command: ChatCommand;
  /**
   * Perfil del convenio, pre-fetched por el router. `null` explícito significa
   * "el convenio no tiene perfil registrado" — el use case no vuelve a
   * consultar la BD.
   */
  perfil: Record<string, unknown> | null;
  /**
   * Sustituye `command.pregunta` en el prompt (uso: `transformRangesRequest`).
   */
  preguntaOverride?: string;
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

/**
 * Dependencias inyectables del use case (para testing y wiring).
 *
 * Las firmas hablan en DTOs neutrales de `application/ports/dtos.ts`. Ningún
 * tipo de `lib/` (fila DB, opciones de SDK) cruza este contrato: los adapters
 * de `infrastructure/` traducen entre ambos mundos.
 */
export interface AskQuestionDeps {
  checkUserQuota: (userId: string) => Promise<QuotaStatus>;
  embedQuestion: (text: string) => Promise<number[]>;
  searchSemanticCache: (
    embedding: number[],
    convenioId: string,
    threshold?: number,
  ) => Promise<CacheHit | null>;
  getConvenioById: (convenioId: string) => Promise<ConvenioSummary | null>;
  searchChunksByConvenio: (
    embedding: number[],
    convenioId: string,
    limit?: number,
    threshold?: number,
  ) => Promise<RetrievedChunk[]>;
  getChunksByGroup: (
    convenioId: string,
    key: "articulo" | "seccion",
    value: string,
  ) => Promise<RetrievedChunk[]>;
  getPerfilByConvenio: (
    convenioId: string,
  ) => Promise<Record<string, unknown> | null>;
  createChatResponse: (request: LlmChatRequest) => Promise<string>;
  streamChatResponse: (
    request: LlmChatRequest,
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
