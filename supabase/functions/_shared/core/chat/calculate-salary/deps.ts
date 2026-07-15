/**
 * Wiring de producción de las dependencias del use case CalculateSalary.
 * Cambia cuando cambia una implementación concreta (proveedor de embeddings,
 * cliente de Supabase, etc.), no cuando cambia el contrato o el flujo.
 */

import {
  createChatResponse as defaultCreateChatResponse,
  streamChatResponse as defaultStreamChatResponse,
} from "../../../lib/anthropic.ts";
import { embedQuestion as defaultEmbedQuestion } from "../../../lib/openai.ts";
import {
  checkUserQuota as defaultCheckUserQuota,
  getConvenioById as defaultGetConvenioById,
  getPerfilByConvenio as defaultGetPerfilByConvenio,
  incrementQueryCount as defaultIncrementQueryCount,
  saveChatMessage as defaultSaveChatMessage,
  saveToSemanticCache as defaultSaveToSemanticCache,
  searchChunksByConvenio as defaultSearchChunksByConvenio,
  searchSemanticCache as defaultSearchSemanticCache,
} from "../../../lib/supabase.ts";
import type { CalculateSalaryDeps } from "./types.ts";

export const defaultDeps: CalculateSalaryDeps = {
  checkUserQuota: defaultCheckUserQuota,
  embedQuestion: defaultEmbedQuestion,
  searchSemanticCache: defaultSearchSemanticCache,
  getConvenioById: defaultGetConvenioById,
  searchChunksByConvenio: defaultSearchChunksByConvenio,
  getPerfilByConvenio: defaultGetPerfilByConvenio,
  createChatResponse: defaultCreateChatResponse,
  streamChatResponse: defaultStreamChatResponse,
  saveToSemanticCache: defaultSaveToSemanticCache,
  saveChatMessage: defaultSaveChatMessage,
  incrementQueryCount: defaultIncrementQueryCount,
};
