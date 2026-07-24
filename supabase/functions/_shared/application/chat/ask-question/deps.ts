/**
 * Wiring de producción de `AskQuestionDeps`: enlaza los adapters de
 * `infrastructure/` al contrato del use case.
 *
 * Los tests inyectan un `AskQuestionDeps` distinto; producción usa este.
 */

import { anthropicLlmChatClient } from "../../../infrastructure/anthropic/llm-chat-client.ts";
import { supabaseChatHistoryRepository } from "../../../infrastructure/supabase/chat-history-repository.ts";
import { supabaseChunkRepository } from "../../../infrastructure/supabase/chunk-repository.ts";
import { supabaseConvenioRepository } from "../../../infrastructure/supabase/convenio-repository.ts";
import { supabasePerfilRepository } from "../../../infrastructure/supabase/perfil-repository.ts";
import { supabaseQuotaService } from "../../../infrastructure/supabase/quota-service.ts";
import { supabaseSemanticCache } from "../../../infrastructure/supabase/semantic-cache.ts";
import { openaiEmbeddingClient } from "../../../infrastructure/openai/embedding-client.ts";
import type { AskQuestionDeps } from "./types.ts";

export const defaultDeps: AskQuestionDeps = {
  checkUserQuota: (userId) => supabaseQuotaService.check(userId),
  embedQuestion: (text) => openaiEmbeddingClient.embed(text),
  searchSemanticCache: (embedding, convenioId, threshold) =>
    supabaseSemanticCache.search(embedding, convenioId, threshold),
  getConvenioById: (convenioId) =>
    supabaseConvenioRepository.getById(convenioId),
  searchChunksByConvenio: (embedding, convenioId, limit, threshold) =>
    supabaseChunkRepository.searchByConvenio(
      embedding,
      convenioId,
      limit,
      threshold,
    ),
  getChunksByGroup: (convenioId, key, value) =>
    supabaseChunkRepository.getByGroup(convenioId, key, value),
  getPerfilByConvenio: (convenioId) =>
    supabasePerfilRepository.getByConvenio(convenioId),
  createChatResponse: (request) => anthropicLlmChatClient.createResponse(request),
  streamChatResponse: (request) => anthropicLlmChatClient.streamResponse(request),
  saveToSemanticCache: (embedding, query, response, convenioId, citations) =>
    supabaseSemanticCache.save(
      embedding,
      query,
      response,
      convenioId,
      citations,
    ),
  saveChatMessage: (sessionId, role, content) =>
    supabaseChatHistoryRepository.saveMessage(sessionId, role, content),
  incrementQueryCount: (userId) => supabaseQuotaService.increment(userId),
};
