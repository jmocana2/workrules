// supabase/functions/_shared/domain/value-objects/user-id.ts

import { err, ok, Result } from "../result.ts";
import { isUuidV4 } from "./uuid.ts";

export type UserId = string & { readonly __brand: "UserId" };

export type UserIdError =
  | { kind: "empty" }
  | { kind: "not_uuid" };

/**
 * Construye un `UserId` validado. Los IDs de Supabase Auth son UUID v4.
 */
export function makeUserId(raw: string): Result<UserId, UserIdError> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return err({ kind: "empty" });
  if (!isUuidV4(trimmed)) return err({ kind: "not_uuid" });
  return ok(trimmed.toLowerCase() as UserId);
}
