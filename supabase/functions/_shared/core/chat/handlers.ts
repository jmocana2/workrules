// supabase/functions/_shared/core/chat/handlers.ts
// Barrel: preserva la API pública consumida por `chat/index.ts`.
// La lógica vive en http/, sse/ y routing/.

export {
  parseRequestBody,
  validateChatRequest,
  type ValidationResult,
} from "./http/request-validator.ts";
export { extractUserIdFromRequest } from "./http/auth.ts";
export {
  buildErrorResponse,
  type ChatHandlerResponse,
} from "./http/error-response.ts";
export {
  type ChatUseCaseResult,
  mapResultToHttpResponse,
} from "./http/result-mapper.ts";
export { buildStatusStreamResponse } from "./sse/status-stream.ts";
export { handleStreamResponse } from "./sse/anthropic-stream.ts";
export { classifyAndExecute } from "./routing/use-case-router.ts";
