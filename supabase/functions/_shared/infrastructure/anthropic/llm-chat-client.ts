// supabase/functions/_shared/infrastructure/anthropic/llm-chat-client.ts

import type { LlmChatClient } from "../../application/ports/llm-chat-client.ts";
import type { LlmChatRequest } from "../../application/ports/dtos.ts";
import type { StreamOptions } from "../../lib/anthropic.ts";
import { createChatResponse, streamChatResponse } from "../../lib/anthropic.ts";

const toStreamOptions = (request: LlmChatRequest): StreamOptions => ({
  systemPrompt: request.systemPrompt,
  userMessage: request.userMessage,
  model: request.model,
  maxTokens: request.maxTokens,
  temperature: request.temperature,
});

export const anthropicLlmChatClient: LlmChatClient = {
  createResponse: (request) => createChatResponse(toStreamOptions(request)),
  streamResponse: (request) => streamChatResponse(toStreamOptions(request)),
};
