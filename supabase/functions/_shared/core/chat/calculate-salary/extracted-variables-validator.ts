/**
 * Red de seguridad para las variables extraídas del texto libre por
 * `extractVariables`. Reutiliza los mismos VOs de dominio que aplica
 * `toChatCommand` a las variables explícitas: si un valor está fuera de
 * rango o no cumple la invariante escalar, se produce un `InvalidVariable`
 * con el mismo shape que ya consume `result-mapper.ts`.
 *
 * Esta función **no** valida invariantes cross-field (jornada+horas): esas
 * las garantiza el propio `extractVariables` (que fuerza coherencia al
 * derivar `horasSemanales` de `jornada` y viceversa).
 */

import type { ExtractedVariables, InvalidVariable } from "../types.ts";
import { makeAntiguedadAnos } from "../../../domain/value-objects/antiguedad-anos.ts";
import { makeHorasExtraAnuales } from "../../../domain/value-objects/horas-extra-anuales.ts";
import { makeHorasNocturnas } from "../../../domain/value-objects/horas-nocturnas.ts";
import { makeHorasSemanales } from "../../../domain/value-objects/horas-semanales.ts";

export function validateExtractedFromText(
  variables: ExtractedVariables,
): InvalidVariable[] {
  const invalid: InvalidVariable[] = [];

  if (variables.horasSemanales !== undefined) {
    const r = makeHorasSemanales(variables.horasSemanales);
    if (!r.ok) {
      invalid.push({
        name: "horasSemanales",
        reason: `horasSemanales_${r.error.kind}`,
        value: variables.horasSemanales,
      });
    }
  }

  if (variables.horasExtra !== undefined) {
    const r = makeHorasExtraAnuales(variables.horasExtra);
    if (!r.ok) {
      invalid.push({
        name: "horasExtra",
        reason: `horasExtraAnuales_${r.error.kind}`,
        value: variables.horasExtra,
      });
    }
  }

  if (variables.horasNocturnas !== undefined) {
    const r = makeHorasNocturnas(variables.horasNocturnas);
    if (!r.ok) {
      invalid.push({
        name: "horasNocturnas",
        reason: `horasNocturnas_${r.error.kind}`,
        value: variables.horasNocturnas,
      });
    }
  }

  if (variables.antiguedadAnos !== undefined) {
    const r = makeAntiguedadAnos(variables.antiguedadAnos);
    if (!r.ok) {
      invalid.push({
        name: "antiguedadAnos",
        reason: `antiguedadAnos_${r.error.kind}`,
        value: variables.antiguedadAnos,
      });
    }
  }

  return invalid;
}
