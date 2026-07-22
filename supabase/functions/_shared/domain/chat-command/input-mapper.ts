// supabase/functions/_shared/domain/chat-command/input-mapper.ts
//
// Punto único donde el DTO HTTP (`ChatRequest`) se convierte en `ChatCommand`.
// Aplica las invariantes cross-field que no encajan en un VO simple:
//   - `horasNocturnas ≤ horasSemanales * 52` (base anual).
//   - `jornada + horasSemanales` construyen una `Jornada` coherente.

import { err, ok, Result } from "../result.ts";
import { Perfil } from "../perfil/perfil.ts";
import {
  AntiguedadAnos,
  AntiguedadAnosError,
  makeAntiguedadAnos,
} from "../value-objects/antiguedad-anos.ts";
import {
  ConvenioIdError,
  makeConvenioId,
} from "../value-objects/convenio-id.ts";
import {
  HorasExtraAnuales,
  HorasExtraAnualesError,
  makeHorasExtraAnuales,
} from "../value-objects/horas-extra-anuales.ts";
import {
  HorasNocturnas,
  HorasNocturnasError,
  makeHorasNocturnas,
} from "../value-objects/horas-nocturnas.ts";
import {
  HorasSemanales,
  HorasSemanalesError,
  makeHorasSemanales,
} from "../value-objects/horas-semanales.ts";
import {
  Jornada,
  JornadaError,
  makeJornada,
  TipoJornada,
} from "../value-objects/jornada.ts";
import { classifyQueryIntent } from "../value-objects/query-intent.ts";
import {
  makeSessionId,
  SessionId,
  SessionIdError,
} from "../value-objects/session-id.ts";
import { makeUserId, UserIdError } from "../value-objects/user-id.ts";
import {
  ChatCommand,
  ChatMessage,
  ExtractedVariablesVO,
} from "./chat-command.ts";

// ============================================
// TIPOS DE ENTRADA
// ============================================

export type ChatRequestRaw = {
  readonly convenio_id: string;
  readonly user_id: string;
  readonly pregunta: string;
  readonly session_id?: string;
  readonly variables?: Record<string, string | number | undefined>;
  readonly messages?: ReadonlyArray<{ role: string; content: string }>;
  readonly stream?: boolean;
  readonly mode?: "salary";
};

export type InvalidChatInput =
  | { kind: "pregunta_empty" }
  | { kind: "convenio_id"; cause: ConvenioIdError }
  | { kind: "user_id"; cause: UserIdError }
  | { kind: "session_id"; cause: SessionIdError }
  | {
    kind: "horas_semanales";
    cause: HorasSemanalesError;
    field: "horasSemanales";
  }
  | {
    kind: "horas_extra_anuales";
    cause: HorasExtraAnualesError;
    field: "horasExtra";
  }
  | {
    kind: "horas_nocturnas";
    cause: HorasNocturnasError;
    field: "horasNocturnas";
  }
  | {
    kind: "antiguedad_anos";
    cause: AntiguedadAnosError;
    field: "antiguedadAnos";
  }
  | { kind: "jornada_invalida"; cause: JornadaError }
  | { kind: "jornada_tipo_desconocido"; raw: string }
  | {
    kind: "horas_nocturnas_exceden_base_anual";
    horasNocturnas: number;
    horasSemanales: number;
    tope: number;
  };

// ============================================
// PARSERS AUXILIARES
// ============================================

function parseNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw.replace(",", "."));
    return Number.isNaN(n) ? Number.NaN : n;
  }
  return Number.NaN;
}

function parseTipoJornada(raw: unknown): TipoJornada | undefined | "invalid" {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") return "invalid";
  const normalized = raw.toLowerCase().trim();
  if (normalized === "completa") return "completa";
  if (normalized === "parcial") return "parcial";
  return "invalid";
}

// ============================================
// MAPEO DE VARIABLES
// ============================================

type MappedVariables = {
  categoria?: string;
  horasSemanales?: HorasSemanales;
  jornada?: Jornada;
  horasExtraAnuales?: HorasExtraAnuales;
  horasNocturnas?: HorasNocturnas;
  antiguedadAnos?: AntiguedadAnos;
  extras?: Record<string, string>;
};

/**
 * Claves del payload `variables` que ya tienen un VO dedicado. Cualquier otra
 * clave del payload se preserva en `extras` (chips de variables críticas del
 * perfil ajenas al VO: `tipo_establecimiento`, `zona`, `nivel`, etc.).
 */
const VO_KNOWN_KEYS: ReadonlySet<string> = new Set([
  "categoria",
  "horasSemanales",
  "jornada",
  "horasExtra",
  "horasExtraAnuales",
  "horasNocturnas",
  "antiguedadAnos",
]);

function mapExtras(
  raw: NonNullable<ChatRequestRaw["variables"]>,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (VO_KNOWN_KEYS.has(key)) continue;
    if (value === undefined || value === null) continue;
    const s = String(value).trim();
    if (s.length === 0) continue;
    out[key] = s;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function mapHorasSemanales(
  raw: unknown,
): Result<HorasSemanales | undefined, InvalidChatInput> {
  const n = parseNumber(raw);
  if (n === undefined) return ok(undefined);
  const r = makeHorasSemanales(n);
  if (!r.ok) {
    return err({
      kind: "horas_semanales",
      cause: r.error,
      field: "horasSemanales",
    });
  }
  return ok(r.value);
}

function mapJornada(
  raw: unknown,
  horas: HorasSemanales | undefined,
): Result<Jornada | undefined, InvalidChatInput> {
  const tipo = parseTipoJornada(raw);
  if (tipo === "invalid") {
    return err({ kind: "jornada_tipo_desconocido", raw: String(raw) });
  }
  if (tipo === undefined || horas === undefined) return ok(undefined);
  const j = makeJornada(tipo, horas);
  if (!j.ok) return err({ kind: "jornada_invalida", cause: j.error });
  return ok(j.value);
}

function mapHorasExtra(
  raw: unknown,
): Result<HorasExtraAnuales | undefined, InvalidChatInput> {
  const n = parseNumber(raw);
  if (n === undefined) return ok(undefined);
  const r = makeHorasExtraAnuales(n);
  if (!r.ok) {
    return err({
      kind: "horas_extra_anuales",
      cause: r.error,
      field: "horasExtra",
    });
  }
  return ok(r.value);
}

function mapHorasNocturnas(
  raw: unknown,
): Result<HorasNocturnas | undefined, InvalidChatInput> {
  const n = parseNumber(raw);
  if (n === undefined) return ok(undefined);
  const r = makeHorasNocturnas(n);
  if (!r.ok) {
    return err({
      kind: "horas_nocturnas",
      cause: r.error,
      field: "horasNocturnas",
    });
  }
  return ok(r.value);
}

function mapAntiguedad(
  raw: unknown,
): Result<AntiguedadAnos | undefined, InvalidChatInput> {
  const n = parseNumber(raw);
  if (n === undefined) return ok(undefined);
  const r = makeAntiguedadAnos(n);
  if (!r.ok) {
    return err({
      kind: "antiguedad_anos",
      cause: r.error,
      field: "antiguedadAnos",
    });
  }
  return ok(r.value);
}

function mapCategoria(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim().length > 0
    ? raw.trim()
    : undefined;
}

function mapVariables(
  raw: NonNullable<ChatRequestRaw["variables"]>,
): Result<MappedVariables, InvalidChatInput> {
  const hs = mapHorasSemanales(raw.horasSemanales);
  if (!hs.ok) return hs;

  const jornada = mapJornada(raw.jornada, hs.value);
  if (!jornada.ok) return jornada;

  const he = mapHorasExtra(raw.horasExtra);
  if (!he.ok) return he;

  const hn = mapHorasNocturnas(raw.horasNocturnas);
  if (!hn.ok) return hn;

  const aa = mapAntiguedad(raw.antiguedadAnos);
  if (!aa.ok) return aa;

  return ok({
    categoria: mapCategoria(raw.categoria),
    horasSemanales: hs.value,
    jornada: jornada.value,
    horasExtraAnuales: he.value,
    horasNocturnas: hn.value,
    antiguedadAnos: aa.value,
    extras: mapExtras(raw),
  });
}

// ============================================
// INVARIANTES CROSS-FIELD
// ============================================

function checkHorasNocturnasVsSemanales(
  v: MappedVariables,
): Result<void, InvalidChatInput> {
  if (v.horasNocturnas === undefined || v.horasSemanales === undefined) {
    return ok(undefined);
  }
  const tope = v.horasSemanales * 52;
  if (v.horasNocturnas > tope) {
    return err({
      kind: "horas_nocturnas_exceden_base_anual",
      horasNocturnas: v.horasNocturnas,
      horasSemanales: v.horasSemanales,
      tope,
    });
  }
  return ok(undefined);
}

// ============================================
// MAPEO PRINCIPAL
// ============================================

/**
 * Convierte un `ChatRequestRaw` en `ChatCommand` validado.
 *
 * El `Perfil` es opcional en esta fase: cuando se pase, validaciones adicionales
 * (p.ej. `categoria ∈ perfil.categorias`) se activarán en fase 8b. Hasta
 * entonces, se acepta `undefined` para poder validar el input a las puertas
 * del router sin haber leído aún el perfil de BD.
 */
export function toChatCommand(
  req: ChatRequestRaw,
  _perfil?: Perfil,
): Result<ChatCommand, InvalidChatInput> {
  const pregunta = req.pregunta?.trim() ?? "";
  if (pregunta.length === 0) return err({ kind: "pregunta_empty" });

  const convenioIdRes = makeConvenioId(req.convenio_id);
  if (!convenioIdRes.ok) {
    return err({ kind: "convenio_id", cause: convenioIdRes.error });
  }

  const userIdRes = makeUserId(req.user_id);
  if (!userIdRes.ok) {
    return err({ kind: "user_id", cause: userIdRes.error });
  }

  let sessionId: SessionId | undefined;
  if (req.session_id !== undefined && req.session_id !== "") {
    const r = makeSessionId(req.session_id);
    if (!r.ok) return err({ kind: "session_id", cause: r.error });
    sessionId = r.value;
  }

  let variables: ExtractedVariablesVO | undefined;
  if (req.variables !== undefined) {
    const mapped = mapVariables(req.variables);
    if (!mapped.ok) return mapped;

    const cross = checkHorasNocturnasVsSemanales(mapped.value);
    if (!cross.ok) return cross;

    variables = {
      categoria: mapped.value.categoria,
      jornada: mapped.value.jornada,
      horasExtraAnuales: mapped.value.horasExtraAnuales,
      horasNocturnas: mapped.value.horasNocturnas,
      antiguedadAnos: mapped.value.antiguedadAnos,
      extras: mapped.value.extras,
    };
  }

  const hasProfileData = variables !== undefined &&
    Object.values(variables).some((v) => v !== undefined);
  const intent = req.mode === "salary"
    ? { kind: "salary_calculation" as const, __brand: "QueryIntent" as const }
    : classifyQueryIntent(pregunta, hasProfileData);

  const messages: ChatMessage[] | undefined = req.messages?.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  return ok({
    convenioId: convenioIdRes.value,
    userId: userIdRes.value,
    sessionId,
    intent,
    pregunta,
    variables,
    messages,
    stream: req.stream === true,
    __brand: "ChatCommand",
  } as ChatCommand);
}
