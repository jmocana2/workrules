// supabase/functions/_shared/domain/labor-law/smi.ts
//
// Salario Mínimo Interprofesional y validación asociada.

/**
 * Salario Minimo Interprofesional 2026
 * RD febrero 2026 - Subida del 3.1%
 */
export const SMI_2026 = {
  /** SMI mensual en 14 pagas */
  mensual14Pagas: 1221,
  /** SMI mensual en 12 pagas (prorrateado) */
  mensual12Pagas: 1424.5, // 1221 * 14 / 12
  /** SMI anual bruto */
  anual: 17094, // 1221 * 14
};

/**
 * Resultado de la validacion contra SMI
 */
export interface SMIValidationResult {
  /** Si el salario es inferior al SMI */
  belowSMI: boolean;
  /** Salario calculado */
  calculatedSalary: number;
  /** SMI aplicable */
  smiApplicable: number;
  /** Diferencia (negativa si esta por debajo) */
  difference: number;
  /** Mensaje para mostrar al usuario si aplica */
  message?: string;
}

/**
 * Valida si un salario mensual es inferior al SMI
 *
 * @param salarioMensual - Salario bruto mensual calculado
 * @param pagas - Numero de pagas (12 o 14). Por defecto 14
 * @returns Resultado de la validacion
 *
 * @example
 * const result = validateAgainstSMI(1100, 14);
 * // result.belowSMI === true
 * // result.message === "El salario calculado (1.100,00€) es inferior al SMI..."
 */
export function validateAgainstSMI(
  salarioMensual: number,
  pagas: 12 | 14 = 14,
): SMIValidationResult {
  const smiMensual = pagas === 14 ? SMI_2026.mensual14Pagas : SMI_2026.mensual12Pagas;
  const difference = salarioMensual - smiMensual;
  const belowSMI = salarioMensual < smiMensual;

  const result: SMIValidationResult = {
    belowSMI,
    calculatedSalary: salarioMensual,
    smiApplicable: smiMensual,
    difference,
  };

  if (belowSMI) {
    const formatEuro = (n: number) =>
      n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    result.message =
      `**Alerta SMI:** El salario calculado (${formatEuro(salarioMensual)}€) ` +
      `es inferior al Salario Minimo Interprofesional vigente ` +
      `(${formatEuro(smiMensual)}€/mes en ${pagas} pagas).\n\n` +
      `Por ley, se debe aplicar el SMI como minimo. ` +
      `El salario mensual seria de **${formatEuro(smiMensual)}€** brutos.\n\n` +
      `*Referencia: Art. 27 del Estatuto de los Trabajadores.*`;
  }

  return result;
}
