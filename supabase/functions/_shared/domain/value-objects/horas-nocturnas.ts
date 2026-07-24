// supabase/functions/_shared/domain/value-objects/horas-nocturnas.ts
//
// Horas nocturnas trabajadas (base semanal o anual — el contexto lo fija el
// caller). La invariante cross-field `horasNocturnas ≤ horasSemanales * 52`
// vive en `ChatCommand` (fase 7), no aquí.

import { err, ok, Result } from "../result.ts";

export type HorasNocturnas = number & { readonly __brand: "HorasNocturnas" };

export type HorasNocturnasError =
  | { kind: "not_finite" }
  | { kind: "below_minimum"; min: 0 };

/**
 * Construye `HorasNocturnas` validando finitud y no-negatividad.
 * Admite fracciones (turnos que empiezan/terminan a media hora nocturna).
 */
export function makeHorasNocturnas(
  n: number,
): Result<HorasNocturnas, HorasNocturnasError> {
  if (!Number.isFinite(n)) return err({ kind: "not_finite" });
  if (n < 0) return err({ kind: "below_minimum", min: 0 });
  return ok(n as HorasNocturnas);
}
