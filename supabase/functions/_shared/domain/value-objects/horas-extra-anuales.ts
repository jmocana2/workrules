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
  | { kind: "above_product_max"; max: number };

/**
 * Construye `HorasExtraAnuales` validando:
 * - Número finito.
 * - Entero (no se pactan fracciones de hora extra a nivel anual).
 * - Rango `[0, LEGAL_LIMITS.horasExtraAnuales]`.
 *
 * NOTA: El máximo NO es un cap legal duro sobre el input bruto del usuario.
 * El Art. 35.2 ET fija 80h anuales sobre las horas extras **computables**:
 * excluye las compensadas con descanso equivalente dentro de 4 meses
 * (Art. 35.1 ET) y las de fuerza mayor / prevención / reparación de siniestros
 * (Art. 35.3 ET). Con solo `n` no podemos afirmar violación legal — este cap
 * actúa como restricción de producto para acotar inputs razonables.
 */
export function makeHorasExtraAnuales(
  n: number,
): Result<HorasExtraAnuales, HorasExtraAnualesError> {
  if (!Number.isFinite(n)) return err({ kind: "not_finite" });
  if (!Number.isInteger(n)) return err({ kind: "not_integer" });
  if (n < 0) return err({ kind: "below_minimum", min: 0 });
  if (n > LEGAL_LIMITS.horasExtraAnuales) {
    return err({
      kind: "above_product_max",
      max: LEGAL_LIMITS.horasExtraAnuales,
    });
  }
  return ok(n as HorasExtraAnuales);
}
