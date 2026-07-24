// supabase/functions/_shared/domain/value-objects/antiguedad-anos.ts
//
// Decisión §5.3 análisis: se ACEPTAN decimales de medio año (0.5).
// Motivo: los convenios permiten trienios prorrateados y los LLM extraen a
// menudo "2 años y medio". Rechazarlo forzaría a Claude a redondear a mano
// y perderíamos precisión. Se rechazan otras fracciones (2.3, 2.75).

import { err, ok, Result } from "../result.ts";
import { LEGAL_LIMITS } from "../labor-law/legal-limits.ts";

export type AntiguedadAnos = number & { readonly __brand: "AntiguedadAnos" };

export type AntiguedadAnosError =
  | { kind: "not_finite" }
  | { kind: "below_minimum"; min: 0 }
  | { kind: "above_maximum"; max: number }
  | { kind: "not_half_year_step" };

/**
 * Construye `AntiguedadAnos`. Rango `[0, LEGAL_LIMITS.antiguedadMaxima]` con
 * paso de 0.5 años.
 */
export function makeAntiguedadAnos(
  n: number,
): Result<AntiguedadAnos, AntiguedadAnosError> {
  if (!Number.isFinite(n)) return err({ kind: "not_finite" });
  if (n < 0) return err({ kind: "below_minimum", min: 0 });
  if (n > LEGAL_LIMITS.antiguedadMaxima) {
    return err({ kind: "above_maximum", max: LEGAL_LIMITS.antiguedadMaxima });
  }
  if ((n * 2) % 1 !== 0) return err({ kind: "not_half_year_step" });
  return ok(n as AntiguedadAnos);
}
