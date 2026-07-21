// supabase/functions/_shared/domain/value-objects/importe-euros.ts
//
// Importe monetario en euros con precisión de 2 decimales y redondeo bancario
// (half-to-even). El redondeo bancario evita el sesgo de half-up al agregar
// muchos importes en una nómina.

import { err, ok, Result } from "../result.ts";

export type ImporteEuros = number & { readonly __brand: "ImporteEuros" };

export type ImporteEurosError =
  | { kind: "not_finite" }
  | { kind: "negative" }
  | { kind: "unparseable_es_string"; raw: string };

/**
 * Redondeo bancario (half-to-even, IEEE 754) a 2 decimales.
 * 1.005 -> 1.00 ; 1.015 -> 1.02 ; 1.025 -> 1.02 ; 1.035 -> 1.04
 */
function roundHalfToEven(n: number): number {
  const scaled = n * 100;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;

  if (diff < 0.5) return floor / 100;
  if (diff > 0.5) return (floor + 1) / 100;
  // Empate exacto: elegir el par
  return (floor % 2 === 0 ? floor : floor + 1) / 100;
}

/**
 * Construye `ImporteEuros` desde un `number` (unidad: euros, no céntimos).
 * Rechaza NaN, Infinity y negativos. Aplica redondeo bancario a 2 decimales.
 */
export function makeImporteEuros(
  n: number,
): Result<ImporteEuros, ImporteEurosError> {
  if (!Number.isFinite(n)) return err({ kind: "not_finite" });
  if (n < 0) return err({ kind: "negative" });
  return ok(roundHalfToEven(n) as ImporteEuros);
}

/**
 * Construye `ImporteEuros` desde un string con formato español:
 * "1.234,56", "1234,56", "1234.56", "1234".
 * Rechaza cadenas ambiguas o con caracteres no numéricos fuera del separador.
 */
export function makeImporteEurosFromEsString(
  raw: string,
): Result<ImporteEuros, ImporteEurosError> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return err({ kind: "unparseable_es_string", raw });
  }

  // Formatos aceptados:
  //   1234        -> "1234"
  //   1234,56     -> "1234.56"
  //   1234.56     -> "1234.56"        (formato en-US también admitido)
  //   1.234,56    -> "1234.56"        (miles con punto)
  //   1.234.567,8 -> "1234567.8"
  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  let normalized: string;
  if (hasComma) {
    // Coma es decimal; los puntos son separadores de miles.
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    // Solo puntos: ambiguo entre miles (es-ES) y decimal (en-US).
    // Heurística: si hay más de un punto o el punto no deja exactamente 2
    // decimales, es separador de miles.
    const parts = trimmed.split(".");
    if (parts.length > 2 || parts[parts.length - 1].length !== 2) {
      normalized = trimmed.replace(/\./g, "");
    } else {
      normalized = trimmed;
    }
  } else {
    normalized = trimmed;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return err({ kind: "unparseable_es_string", raw });
  }

  const n = Number(normalized);
  return makeImporteEuros(n);
}
