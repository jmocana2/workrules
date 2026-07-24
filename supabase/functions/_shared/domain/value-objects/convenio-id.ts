// supabase/functions/_shared/domain/value-objects/convenio-id.ts

import { err, ok, Result } from "../result.ts";
import { isUuidV4 } from "./uuid.ts";

export type ConvenioId = string & { readonly __brand: "ConvenioId" };

export type ConvenioIdError =
  | { kind: "empty" }
  | { kind: "not_uuid" };

/**
 * Construye un `ConvenioId` validado desde un string arbitrario.
 * Acepta UUID v4 en cualquier casing y devuelve el valor normalizado a
 * minúsculas.
 */
export function makeConvenioId(
  raw: string,
): Result<ConvenioId, ConvenioIdError> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return err({ kind: "empty" });
  if (!isUuidV4(trimmed)) return err({ kind: "not_uuid" });
  return ok(trimmed.toLowerCase() as ConvenioId);
}
