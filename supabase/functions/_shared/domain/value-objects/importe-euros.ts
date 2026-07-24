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
 * Redondeo bancario (half-to-even) a 2 decimales.
 * 1.005 -> 1.00 ; 1.015 -> 1.02 ; 1.025 -> 1.02 ; 1.035 -> 1.04
 *
 * Opera sobre la representación decimal exacta del número (vía string) para
 * evitar sesgos de coma flotante binaria: `1.015 * 100` en IEEE-754 no es
 * `101.5` sino `101.49999999999999`, lo que rompería el criterio de empate.
 */
function roundHalfToEven(n: number): number {
  // Representación decimal con precisión suficiente para exponer el 5 de empate
  // antes de que el ruido binario lo desplace. 12 decimales cubren cualquier
  // importe monetario razonable sin arrastrar artefactos IEEE-754.
  const [intPart, fracPartRaw = ""] = n.toFixed(12).split(".");
  const fracPart = fracPartRaw.padEnd(3, "0");

  const keepStr = intPart + fracPart.slice(0, 2);
  const nextDigit = Number(fracPart[2]);
  const rest = fracPart.slice(3);
  let restNonZero = false;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] !== "0") {
      restNonZero = true;
      break;
    }
  }

  let cents = Number(keepStr);
  if (nextDigit > 5 || (nextDigit === 5 && restNonZero)) {
    cents += 1;
  } else if (nextDigit === 5 && !restNonZero) {
    // Empate exacto: elegir el par
    if (cents % 2 !== 0) cents += 1;
  }
  return cents / 100;
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

  // Formatos aceptados (validados con gramática explícita, no heurística):
  //   1234        -> "1234"                 (us/entero)
  //   1234,56     -> "1234.56"              (es-ES sin miles)
  //   1234.56     -> "1234.56"              (en-US decimal)
  //   1.234,56    -> "1234.56"              (es-ES con miles)
  //   1.234.567,8 -> "1234567.8"            (es-ES con miles)
  // Rechazados: "1.2", "1.2345", "1..23", "1.23.45", etc.
  const esFormat = /^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/;
  const usFormat = /^-?\d+(?:\.\d+)?$/;

  let normalized: string;
  if (esFormat.test(trimmed)) {
    // Coma decimal opcional; los puntos son separadores de miles.
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (usFormat.test(trimmed)) {
    normalized = trimmed;
  } else {
    return err({ kind: "unparseable_es_string", raw });
  }

  const n = Number(normalized);
  return makeImporteEuros(n);
}
