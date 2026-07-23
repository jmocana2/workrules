/**
 * Wiring de producción de `AskQuestionDeps`: enlaza las implementaciones
 * reales (Supabase, OpenAI, Anthropic) al contrato del use case.
 *
 * Los tests inyectan un `AskQuestionDeps` distinto; producción usa este.
 */

import {
  createChatResponse as defaultCreateChatResponse,
  streamChatResponse as defaultStreamChatResponse,
} from "../../../lib/anthropic.ts";
import { embedQuestion as defaultEmbedQuestion } from "../../../lib/openai.ts";
import {
  checkUserQuota as defaultCheckUserQuota,
  getChunksByGroup as defaultGetChunksByGroup,
  getConvenioById as defaultGetConvenioById,
  getPerfilByConvenio as defaultGetPerfilByConvenio,
  incrementQueryCount as defaultIncrementQueryCount,
  saveChatMessage as defaultSaveChatMessage,
  saveToSemanticCache as defaultSaveToSemanticCache,
  searchChunksByConvenio as defaultSearchChunksByConvenio,
  searchSemanticCache as defaultSearchSemanticCache,
} from "../../../lib/supabase.ts";
import type { AskQuestionDeps } from "./types.ts";

export const defaultDeps: AskQuestionDeps = {
  checkUserQuota: defaultCheckUserQuota,
  embedQuestion: defaultEmbedQuestion,
  searchSemanticCache: defaultSearchSemanticCache,
  getConvenioById: defaultGetConvenioById,
  searchChunksByConvenio: defaultSearchChunksByConvenio,
  getChunksByGroup: defaultGetChunksByGroup,
  getPerfilByConvenio: defaultGetPerfilByConvenio,
  createChatResponse: defaultCreateChatResponse,
  streamChatResponse: defaultStreamChatResponse,
  saveToSemanticCache: defaultSaveToSemanticCache,
  saveChatMessage: defaultSaveChatMessage,
  incrementQueryCount: defaultIncrementQueryCount,
};
