// supabase/functions/_shared/domain/value-objects/horas-semanales.ts

import { err, ok, Result } from "../result.ts";
import { LEGAL_LIMITS } from "../labor-law/legal-limits.ts";

export type HorasSemanales = number & { readonly __brand: "HorasSemanales" };

export type HorasSemanalesError =
  | { kind: "not_finite" }
  | { kind: "below_minimum"; min: number }
  | { kind: "above_legal_max"; max: number; source: "Art. 34.1 ET" }
  | { kind: "not_half_hour_step" };

/**
 * Construye `HorasSemanales` validando:
 * - Número finito (rechaza NaN, Infinity, -Infinity).
 * - Rango legal `[jornadaSemanalMinima, jornadaSemanalMaxima]` (Art. 34.1 ET).
 * - Múltiplos de 0.5 (decisión §5.1 análisis: los convenios no pactan
 *   fracciones más finas que media hora).
 */
export function makeHorasSemanales(
  n: number,
): Result<HorasSemanales, HorasSemanalesError> {
  if (!Number.isFinite(n)) return err({ kind: "not_finite" });
  if (n < LEGAL_LIMITS.jornadaSemanalMinima) {
    return err({ kind: "below_minimum", min: LEGAL_LIMITS.jornadaSemanalMinima });
  }
  if (n > LEGAL_LIMITS.jornadaSemanalMaxima) {
    return err({
      kind: "above_legal_max",
      max: LEGAL_LIMITS.jornadaSemanalMaxima,
      source: "Art. 34.1 ET",
    });
  }
  if ((n * 2) % 1 !== 0) return err({ kind: "not_half_hour_step" });
  return ok(n as HorasSemanales);
}
