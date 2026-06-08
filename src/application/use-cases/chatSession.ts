import type { ConversationSummary } from "@core/types";
import type {
  ChatMessageRecord,
  IChatSessionRepository,
} from "@/application/ports";

interface ChatSessionDeps {
  repo: IChatSessionRepository;
}

export async function listUserChatSessions(
  userId: string | null,
  deps: ChatSessionDeps,
): Promise<ConversationSummary[]> {
  if (!userId) return [];
  return deps.repo.listByUser(userId);
}

export async function deleteChatSession(
  sessionId: string,
  deps: ChatSessionDeps,
): Promise<void> {
  return deps.repo.deleteById(sessionId);
}

export async function createChatSession(
  input: { userId: string; convenioId: string; firstMessage: string },
  deps: ChatSessionDeps,
): Promise<string | null> {
  return deps.repo.create(input);
}

export async function loadChatSessionMessages(
  sessionId: string,
  deps: ChatSessionDeps,
): Promise<ChatMessageRecord[] | null> {
  return deps.repo.loadMessages(sessionId);
}

export async function getConvenioIdForSession(
  sessionId: string,
  deps: ChatSessionDeps,
): Promise<string | null> {
  return deps.repo.getConvenioIdForSession(sessionId);
}
