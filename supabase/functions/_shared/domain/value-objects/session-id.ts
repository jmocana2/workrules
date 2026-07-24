// supabase/functions/_shared/domain/value-objects/session-id.ts

import { err, ok, Result } from "../result.ts";
import { isUuidV4 } from "./uuid.ts";

export type SessionId = string & { readonly __brand: "SessionId" };

export type SessionIdError =
  | { kind: "empty" }
  | { kind: "not_uuid" };

/**
 * Construye un `SessionId` validado. Las sesiones de chat se identifican
 * por UUID v4 generado en el cliente.
 */
export function makeSessionId(
  raw: string,
): Result<SessionId, SessionIdError> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return err({ kind: "empty" });
  if (!isUuidV4(trimmed)) return err({ kind: "not_uuid" });
  return ok(trimmed.toLowerCase() as SessionId);
}
