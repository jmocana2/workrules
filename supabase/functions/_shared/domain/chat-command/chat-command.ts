// supabase/functions/_shared/domain/chat-command/chat-command.ts
//
// Comando validado del use case de chat. Es la representación de dominio del
// `ChatRequest` HTTP: cuando existe un `ChatCommand`, todas sus partes ya
// pasaron por sus VOs y no queda validación pendiente.

import { AntiguedadAnos } from "../value-objects/antiguedad-anos.ts";
import { ConvenioId } from "../value-objects/convenio-id.ts";
import { HorasExtraAnuales } from "../value-objects/horas-extra-anuales.ts";
import { HorasNocturnas } from "../value-objects/horas-nocturnas.ts";
import { Jornada } from "../value-objects/jornada.ts";
import { QueryIntent } from "../value-objects/query-intent.ts";
import { SessionId } from "../value-objects/session-id.ts";
import { UserId } from "../value-objects/user-id.ts";

export type ExtractedVariablesVO = {
  readonly categoria?: string;
  readonly jornada?: Jornada;
  readonly horasExtraAnuales?: HorasExtraAnuales;
  readonly horasNocturnas?: HorasNocturnas;
  readonly antiguedadAnos?: AntiguedadAnos;
};

export type ChatMessage = {
  readonly role: "user" | "assistant";
  readonly content: string;
};

export type ChatCommand = {
  readonly convenioId: ConvenioId;
  readonly userId: UserId;
  readonly sessionId?: SessionId;
  readonly intent: QueryIntent;
  readonly pregunta: string;
  readonly variables?: ExtractedVariablesVO;
  readonly messages?: readonly ChatMessage[];
  readonly stream: boolean;
  readonly __brand: "ChatCommand";
};
