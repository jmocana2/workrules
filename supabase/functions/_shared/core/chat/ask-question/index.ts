/**
 * Barrel del use case AskQuestion.
 * Los consumidores externos importan desde aquí (o desde `../ask-question.ts`,
 * que es un shim que re-exporta este módulo).
 */

export { askQuestion } from "./ask-question.ts";
export { defaultDeps } from "./deps.ts";
export type {
  AskQuestionCacheHit,
  AskQuestionDeps,
  AskQuestionError,
  AskQuestionInput,
  AskQuestionMetadata,
  AskQuestionNotFound,
  AskQuestionQuotaExceeded,
  AskQuestionResult,
  AskQuestionStreamResult,
  AskQuestionSuccess,
} from "./types.ts";
