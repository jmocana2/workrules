// supabase/functions/_shared/domain/value-objects/horas-extra-anuales.ts

import { err, ok, Result } from "../result.ts";
import { LEGAL_LIMITS } from "../labor-law/legal-limits.ts";

export type HorasExtraAnuales = number & {
  readonly __brand: "HorasExtraAnuales";
};

export type HorasExtraAnualesError =
  | { kind: "not_finite" }
  | { kind: "not_integer" }
  | { kind: "below_minimum"; min: 0 }
  | { kind: "above_legal_max"; max: number; source: "Art. 35.2 ET" };

/**
 * Construye `HorasExtraAnuales` validando:
 * - Número finito.
 * - Entero (no se pactan fracciones de hora extra a nivel anual).
 * - Rango `[0, LEGAL_LIMITS.horasExtraAnuales]` (Art. 35.2 ET).
 */
export function makeHorasExtraAnuales(
  n: number,
): Result<HorasExtraAnuales, HorasExtraAnualesError> {
  if (!Number.isFinite(n)) return err({ kind: "not_finite" });
  if (!Number.isInteger(n)) return err({ kind: "not_integer" });
  if (n < 0) return err({ kind: "below_minimum", min: 0 });
  if (n > LEGAL_LIMITS.horasExtraAnuales) {
    return err({
      kind: "above_legal_max",
      max: LEGAL_LIMITS.horasExtraAnuales,
      source: "Art. 35.2 ET",
    });
  }
  return ok(n as HorasExtraAnuales);
}
