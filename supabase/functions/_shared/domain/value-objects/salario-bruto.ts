// supabase/functions/_shared/domain/value-objects/salario-bruto.ts
//
// Salario bruto (mensual o anual — el contexto lo fija el caller). Envuelve
// `ImporteEuros` para ganar identidad de tipo: un `SalarioBruto` no se puede
// confundir con un `ComplementoNocturno` aunque ambos sean importes.
//
// §5.4 análisis: intercepta explícitamente `NaN`/`Infinity` devueltos por
// el LLM, redundante con `ImporteEuros` pero deja la razón trazada.

import { map, Result } from "../result.ts";
import {
  ImporteEuros,
  ImporteEurosError,
  makeImporteEuros,
} from "./importe-euros.ts";

export type SalarioBruto = ImporteEuros & { readonly __salarioBruto: true };

export type SalarioBrutoError = ImporteEurosError;

/**
 * Construye `SalarioBruto` desde un `number`.
 * Delega la validación de finitud/no-negatividad a `makeImporteEuros`.
 */
export function makeSalarioBruto(
  n: number,
): Result<SalarioBruto, SalarioBrutoError> {
  return map(makeImporteEuros(n), (importe) => importe as SalarioBruto);
}
