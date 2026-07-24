// supabase/functions/_shared/domain/chat-command/chat-command.ts
//
// Comando validado del use case de chat. Es la representación de dominio del
// `ChatRequest` HTTP: cuando existe un `ChatCommand`, todas sus partes ya
// pasaron por sus VOs y no queda validación pendiente.

import { AntiguedadAnos } from "../value-objects/antiguedad-anos.ts";
import { ConvenioId } from "../value-objects/convenio-id.ts";
import { HorasExtraAnuales } from "../value-objects/horas-extra-anuales.ts";
import { HorasNocturnas } from "../value-objects/horas-nocturnas.ts";
import { HorasSemanales } from "../value-objects/horas-semanales.ts";
import { Jornada } from "../value-objects/jornada.ts";
import { QueryIntent } from "../value-objects/query-intent.ts";
import { SessionId } from "../value-objects/session-id.ts";
import { UserId } from "../value-objects/user-id.ts";

export type ExtractedVariablesVO = {
  readonly categoria?: string;
  /**
   * Horas semanales sueltas: se preservan aunque no venga `jornada` tipo.
   * Cuando ambos vienen, `jornada.horas === horasSemanales`.
   */
  readonly horasSemanales?: HorasSemanales;
  readonly jornada?: Jornada;
  readonly horasExtraAnuales?: HorasExtraAnuales;
  readonly horasNocturnas?: HorasNocturnas;
  readonly antiguedadAnos?: AntiguedadAnos;
  /**
   * Claves adicionales que aporta el usuario (chips seleccionados de
   * `variables_criticas` del perfil, ej. `tipo_establecimiento`, `zona`,
   * `nivel`). Son agnósticas al convenio y no tienen VO propio: se preservan
   * sin validar y se propagan como Record al pipeline legacy.
   */
  readonly extras?: Readonly<Record<string, string>>;
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
