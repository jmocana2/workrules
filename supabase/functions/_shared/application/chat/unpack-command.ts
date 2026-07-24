// supabase/functions/_shared/application/chat/unpack-command.ts
//
// Helper puro: desempaqueta un `ChatCommand` a los primitivos que consume el
// pipeline RAG. Encapsula la coerción de branded strings a `string` (y las
// serializaciones auxiliares como `variables`) en un único sitio, evitando
// los `as unknown as string` diseminados por los use cases (refactor 007 P2).

import type { ChatCommand } from "../../domain/chat-command/chat-command.ts";
import {
  voToExtractedVariables,
  variablesToRecord,
} from "./calculate-salary/variable-adapters.ts";

export interface UnpackedChatCommand {
  convenioId: string;
  userId: string;
  sessionId: string | undefined;
  pregunta: string;
  stream: boolean;
  messages: { role: "user" | "assistant"; content: string }[] | undefined;
  variables: Record<string, string>;
}

export function unpackChatCommand(command: ChatCommand): UnpackedChatCommand {
  return {
    convenioId: command.convenioId as string,
    userId: command.userId as string,
    sessionId: command.sessionId as string | undefined,
    pregunta: command.pregunta,
    stream: command.stream,
    messages: command.messages as
      | { role: "user" | "assistant"; content: string }[]
      | undefined,
    variables: variablesToRecord(voToExtractedVariables(command.variables)),
  };
}
