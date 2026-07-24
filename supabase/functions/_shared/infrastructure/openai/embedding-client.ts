// supabase/functions/_shared/infrastructure/openai/embedding-client.ts

import type { EmbeddingClient } from "../../application/ports/embedding-client.ts";
import { embedQuestion } from "../../lib/openai.ts";

export const openaiEmbeddingClient: EmbeddingClient = {
  embed: (text) => embedQuestion(text),
};
