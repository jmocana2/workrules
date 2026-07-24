// supabase/functions/_shared/infrastructure/supabase/chat-history-repository.ts

import type { ChatHistoryRepository } from "../../application/ports/chat-history-repository.ts";
import { saveChatMessage } from "../../lib/supabase.ts";

export const supabaseChatHistoryRepository: ChatHistoryRepository = {
  saveMessage: (sessionId, role, content) =>
    saveChatMessage(sessionId, role, content),
};
