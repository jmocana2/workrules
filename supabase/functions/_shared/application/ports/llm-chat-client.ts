// supabase/functions/_shared/application/ports/llm-chat-client.ts

import type { LlmChatRequest } from "./dtos.ts";

/**
 * Cliente de chat con un LLM. Neutral respecto al proveedor: los adapters
 * (Anthropic, OpenAI, Bedrock, ...) mapean `LlmChatRequest` a la API concreta.
 */
export interface LlmChatClient {
  /** Genera una respuesta completa en un solo turno. */
  createResponse(request: LlmChatRequest): Promise<string>;
  /** Genera una respuesta en streaming SSE. */
  streamResponse(request: LlmChatRequest): Promise<ReadableStream<Uint8Array>>;
}
